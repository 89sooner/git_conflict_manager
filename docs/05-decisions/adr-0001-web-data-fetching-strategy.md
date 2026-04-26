# ADR-0001 · Web Data Fetching & Dev Auth Strategy

- 상태: Accepted
- 작성일: 2026-04-14
- 작성자: claude
- 관련 작업: T-014 (Phase 5 web shell completion)

## 맥락

`apps/web`가 Phase 5 마무리에 진입한다. PR/Repository/Conflict/Backout 화면이 백엔드 read model API를 호출해야 하며, 다음 결정들이 필요하다.

1. data fetching: server component fetch만 쓸 것인지, React Query/SWR 등 client cache를 도입할 것인지
2. dev/SSO: 인증 진입을 어떻게 처리할 것인지
3. base URL: SSR과 CSR이 동일 URL로 API를 부를 것인지, 분리할 것인지

이 결정은 Phase 6 (PR 핵심 기능)부터 매우 자주 인용되므로 ADR로 고정한다.

## 결정 1 — Server component 직접 fetch로 시작한다

### 결정

`apps/web`의 모든 데이터 페이지는 Next.js App Router server component에서 `fetch`를 직접 호출하는 패턴으로 시작한다. React Query, SWR, Apollo 등 별도 client cache 라이브러리는 도입하지 않는다.

### 근거

1. 현재는 read-only 화면 위주이고, mutation은 Phase 6 후반 (PR action, conflict resolution start, backout request) 이후 본격화된다.
2. server component fetch는 Next 15에서 표준 패턴이며, 별도 hydration/cache 관리가 필요 없어 초기 학습/운영 부담이 작다.
3. shared-types와 자연스럽게 결합된다. 응답 envelope (`DataEnvelope<T>` / `ErrorEnvelope`)을 그대로 typed로 받는다.
4. client cache 도입은 다음 트리거 중 하나가 발생할 때 재평가한다.
   - 상호작용형 리스트(필터링, 무한스크롤, optimistic update)
   - 동일 데이터를 여러 컴포넌트에서 요구해 dedup이 필요
   - websocket/SSE 기반 실시간 업데이트

### 영향

- `apps/web/lib/api/`에 server-safe `apiFetch` wrapper만 둔다.
- error 처리는 try/catch + `ErrorState` 컴포넌트로 일원화한다.
- loading은 React Suspense + `ListSkeleton`/`DetailSkeleton` 패턴으로 처리한다.

## 결정 2 — Dev mode는 헤더 주입, SSO는 Phase 10에서 처리

### 결정

dev/local 환경에서는 `GSP_DEV_USER` 환경변수가 `bootstrap`이면 모든 server fetch에 `x-gsp-dev-user: bootstrap` 헤더를 자동 주입한다. 실제 SSO/OIDC/SAML 통합은 Phase 10 hardening에서 처리한다.

### 근거

1. 백엔드 `auth` plugin이 이미 `x-gsp-dev-user: bootstrap` 헤더로 dev session을 생성하도록 설계되어 있다 (T-009).
2. dev에서 매번 토큰을 발급하는 부담이 없고, 401 경로는 헤더가 빠진 상태로 자동 테스트된다.
3. 향후 SSO 진입점은 `lib/auth/session.ts`에 `getSession()` 함수로 추상화되어 있어, dev 헤더 분기만 갈아끼우면 된다.
4. Phase 5의 DoD는 "auth 기반 가드 동작"이지 SSO 통합이 아니다.

### 영향

- `apps/web/lib/auth/session.ts`에 `getDevSession()`을 둔다.
- `apiFetch`는 인자 없이도 자동으로 dev 헤더를 붙인다.
- 미인증 화면은 Phase 10에서 처리하고, 본 phase에서는 dev mode에서 항상 인증된 상태를 가정한다.
- 환경변수 미설정 시 헤더가 누락되어 401이 발생하므로, README와 `.env.example`에 명시한다.

## 결정 3 — Server/Client base URL 분리

### 결정

API base URL을 두 개의 환경변수로 분리한다.

- `API_BASE_URL_INTERNAL`: server-side fetch (Node)에서 사용. docker/k8s 환경에서 internal DNS 또는 service name을 가리킨다. 기본값 `http://localhost:4000`.
- `NEXT_PUBLIC_API_BASE_URL`: 브라우저(클라이언트) fetch에서 사용. 외부에 노출 가능한 URL. 기본값 `http://localhost:4000`.

`apiFetch`는 실행 컨텍스트(`typeof window === 'undefined'`)를 감지해서 둘 중 하나를 선택한다.

### 근거

1. Phase 5는 server component 중심이지만, 일부 client interaction(필터, 검색)은 Phase 6에서 도입된다. 그때 base URL이 다를 수 있다.
2. SSR과 CSR이 동일 URL을 강제하면 컨테이너 환경에서 SSR이 외부 도메인을 거꾸로 타고 들어가는 비효율이 발생한다.
3. 환경변수 분리는 Next.js 표준 패턴이고, 두 변수 모두 누락돼도 dev에서는 API 기본 포트와 일치하는 `localhost:4000`로 동작한다.

### 영향

- `apiFetch`가 단일 진입점이 되어 base URL 선택 로직을 캡슐화한다.
- 향후 staging/production 배포 시 두 환경변수를 분리해서 주입한다.

## 대안

- **React Query 즉시 도입**: 학습 비용이 크고, 현 단계에서는 unnecessary. Phase 6 mutation 도입 시 재평가.
- **OpenAPI codegen으로 client 자동 생성**: 도구 의존성과 빌드 단계가 하나 늘어난다. shared-types로도 충분한 type safety가 확보되므로 Phase 10에서 재평가.
- **Single base URL**: 단순하지만 컨테이너 환경에서 SSR routing 문제가 발생할 수 있어 미채택.

## 후속 작업

- Phase 6 진입 시 mutation/optimistic update 패턴을 ADR-0004+로 분리한다. (ADR-0002는 mockReadModel 폐기에 사용됨)
- Phase 10 SSO 통합 시 별도 ADR로 SSO 결정을 기록한다. (ADR-0003은 runtime-store 전략에 사용됨)

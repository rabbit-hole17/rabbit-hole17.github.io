# JSON 데이터 계약 · v1.0.0

현재 공개 데이터는 확인·문헌상 확인 항목만 포함합니다. 오류·근거 부족·보류 항목 및 해당 항목만 참조하는 출처와 게시글은 제외합니다.

## graph.json

`nodes`의 `type`은 `topic` 또는 `knowledge`입니다. 주제 노드는 `id`, `label`, `color`를, 지식 노드는 `id`, `label`, `topicId`, `category`, `status`를 가집니다. 지식 상세는 knowledge.json에서 같은 ID로 찾습니다.

`edges` 필드:

| 필드 | 의미 |
|---|---|
| id | 관계의 고유 식별자 |
| source / target | 양쪽 노드 ID |
| type | topic, shared_source, shared_post |
| label | 사람이 읽는 관계명 |
| basis | 연결을 만든 실제 주제·출처·게시글 ID 목록 |

`topic`은 주제 → 지식의 소속 관계입니다. `shared_source`와 `shared_post`는 방향 없는 공통 참조 관계입니다. source/target의 저장 순서는 인과 또는 우선순위를 뜻하지 않습니다. 같은 두 지식 사이에 두 종류의 관계가 공존할 수 있습니다.

## knowledge.json

`items` 배열의 각 항목:

| 필드 | 의미 |
|---|---|
| id | F01 같은 확인된 정보 ID |
| title | 그래프용 짧은 제목 |
| topicId | 소속 주제 ID |
| category | verified(확인)만 공개 |
| status | 확인 또는 문헌상 확인 |
| claim | 원문 주장 또는 검토 대상의 요지 |
| verification | 검증 내용 |
| limitations | 해석 한계와 미검증 범위 |
| sourceIds | sources.json 참조. 한 개 이상 필수 |
| postIds | posts.json 참조 |
| checkedAt | 검토일. 사건 발생일 또는 현재 상태 확인일과 다름 |
| members | 선택 필드. 해당 자료의 명단을 `{name, party}` 배열로 제공. party는 자료 당시 소속이며 명단의 확인 범위는 verification·limitations를 함께 참조 |

## sources.json / posts.json

두 파일 모두 `schemaVersion`과 `items`를 가집니다.

- 출처: `id`, `title`, `url`, `type`, `publishedAt`. 게시일이 불명인 경우 문자열로 명시합니다.
- 게시글: `id`, `title`, `postedAt`, `url`, `materialStatus`, `knowledgeIds`. b 접두사는 bogwanso, r은 renew입니다.
- 게시글 제목과 원문은 미검증 주장을 포함할 수 있습니다. 연결된 확인 항목에 해당하는 범위만 검증되었으며 게시글 전문의 사실성을 뜻하지 않습니다. knowledgeIds에는 공개된 확인 항목 ID만 포함합니다.
- 공개 URL만 내보냅니다. 외부 원문 링크는 이후 삭제되거나 접근이 제한될 수 있습니다.

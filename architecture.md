# Architecture Documentation

## System Overview

Reality Check AI uses a **hybrid intelligence architecture** combining real-time search, pre-indexed data, and AI analysis for information verification.

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        A[React Frontend]
        A1[WebSocket Client]
        A2[HTTP Client]
    end
    
    subgraph "API Gateway Layer"
        B[Express Server]
        B1[Socket.IO Server]
        B2[REST API]
        B3[Redis Cache]
    end
    
    subgraph "Search Orchestration Layer"
        C[Conversation Controller]
        C1[Live Search Service]
        C2[Elastic Service]
    end
    
    subgraph "External APIs"
        D1[NewsAPI]
        D2[Google Custom Search]
        D3[Fact-Checker Sites]
        D4[Government Sources]
    end
    
    subgraph "Data Layer"
        E1[Elasticsearch Cluster]
        E2[Redis Cache]
    end
    
    subgraph "AI Layer"
        F[Vertex AI Service]
        F1[Gemini 2.0 Flash]
        F2[Text Embeddings]
    end
    
    A --> A1
    A --> A2
    A1 --> B1
    A2 --> B2
    B1 --> C
    B2 --> C
    C --> B3
    C --> C1
    C --> C2
    
    C1 --> D1
    C1 --> D2
    C1 --> D3
    C1 --> D4
    
    C2 --> E1
    B3 --> E2
    
    C --> F
    F --> F1
    F --> F2
    
    style A fill:#61dafb
    style B fill:#68a063
    style C fill:#ffd43b
    style F fill:#4285f4
    style E1 fill:#00bfb3
```

##  Complete Request Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant WS as WebSocket
    participant BE as Backend API
    participant RC as Redis Cache
    participant LS as Live Search
    participant ES as Elasticsearch
    participant VA as Vertex AI
    participant EXT as External APIs
    
    U->>FE: Ask question
    FE->>WS: emit('ask-question')
    WS->>BE: Handle question
    
    BE->>RC: Check cache
    alt Cache Hit
        RC-->>BE: Return cached result
        BE-->>WS: emit('question-response')
        WS-->>FE: Display response
    else Cache Miss
        BE->>WS: emit('search-progress', 'understanding')
        BE->>VA: Generate embeddings (optional)
        VA-->>BE: Return embeddings
        
        BE->>WS: emit('search-progress', 'searching')
        
        par Live Search
            BE->>LS: Comprehensive search
            LS->>EXT: NewsAPI request
            LS->>EXT: Google Search request
            LS->>EXT: Fact-checker request
            LS->>EXT: Government sites request
            EXT-->>LS: Return results
        and Indexed Search
            BE->>ES: Hybrid search
            ES-->>BE: Return indexed results
        end
        
        BE->>BE: Combine & deduplicate
        BE->>WS: emit('search-progress', 'analyzing')
        
        BE->>VA: Analyze credibility
        VA-->>BE: Credibility scores
        
        BE->>VA: Detect bias
        VA-->>BE: Bias analysis
        
        BE->>WS: emit('search-progress', 'generating')
        
        BE->>VA: Generate response
        VA-->>BE: Conversational response
        
        BE->>VA: Generate follow-ups
        VA-->>BE: Follow-up questions
        
        BE->>RC: Cache result
        BE->>WS: emit('question-response')
        WS->>FE: Display response
    end
    
    FE->>U: Show answer with sources
```

##  Data Flow Architecture

```mermaid
graph TD
    A[User Question] --> B[Intent Understanding]
    B --> C{Search Strategy}
    
    C --> D[Live APIs]
    C --> E[Elasticsearch]
    
    D --> F[NewsAPI<br/>15 results]
    D --> G[Google Search<br/>10 results]
    D --> H[Fact-Checkers<br/>10 results]
    D --> I[Gov Sources<br/>5 results]
    
    E --> J[Indexed Data<br/>18 docs]
    
    F --> K[Combine Results]
    G --> K
    H --> K
    I --> K
    J --> K
    
    K --> L[Deduplicate]
    L --> M[Rank by Credibility]
    M --> N[AI Analysis]
    
    N --> O[Credibility Scoring]
    N --> P[Bias Detection]
    N --> Q[Consensus Evaluation]
    
    O --> R[Response Generation]
    P --> R
    Q --> R
    
    R --> S[Cache Result]
    S --> T[Return to User]
    
    style D fill:#51cf66
    style E fill:#4ecdc4
    style N fill:#339af0
    style R fill:#845ef7
```

## Search Architecture Pattern

### Hybrid Search Strategy

```mermaid
graph LR
    A[User Query] --> B[Query Processor]
    
    B --> C[Text Analysis]
    B --> D[Embedding Generation]
    
    C --> E[BM25 Keyword Search]
    D --> F[Vector Similarity Search]
    
    E --> G[Merge Results]
    F --> G
    
    G --> H[Apply Credibility Weights]
    H --> I[Temporal Boosting]
    I --> J[Final Ranked Results]
    
    style C fill:#ffd43b
    style D fill:#339af0
    style H fill:#51cf66
```

### Search Index Structure

```mermaid
classDiagram
    class NewsIndex {
        +string title
        +text content
        +keyword outlet
        +keyword bias_rating
        +float credibilityScore
        +date publishDate
        +dense_vector embeddings
        +keyword[] tags
    }
    
    class StudiesIndex {
        +string title
        +text content
        +keyword journal
        +keyword doi
        +boolean peer_reviewed
        +float credibilityScore
        +date publishDate
        +dense_vector embeddings
        +keyword[] tags
    }
    
    class FactChecksIndex {
        +text claim
        +text content
        +keyword verdict
        +keyword factchecker
        +float credibilityScore
        +date publishDate
        +dense_vector embeddings
        +string url
    }
    
    class GovernmentIndex {
        +string title
        +text content
        +keyword agency
        +float credibilityScore
        +date publishDate
        +dense_vector embeddings
        +string url
    }
```

##  Design Patterns

### 1. Strategy Pattern - Search Strategy

```mermaid
classDiagram
    class SearchStrategy {
        <<interface>>
        +search(query) Result[]
    }
    
    class LiveSearchStrategy {
        +newsAPI
        +googleSearch
        +search(query) Result[]
    }
    
    class IndexedSearchStrategy {
        +elasticsearch
        +search(query) Result[]
    }
    
    class HybridSearchStrategy {
        +liveSearch
        +indexedSearch
        +search(query) Result[]
        +merge(results) Result[]
    }
    
    SearchStrategy <|-- LiveSearchStrategy
    SearchStrategy <|-- IndexedSearchStrategy
    SearchStrategy <|-- HybridSearchStrategy
    
    HybridSearchStrategy --> LiveSearchStrategy
    HybridSearchStrategy --> IndexedSearchStrategy
```

### 2. Observer Pattern - Real-time Updates

```mermaid
classDiagram
    class SearchObserver {
        <<interface>>
        +onSearchProgress(stage, message)
        +onSearchComplete(results)
        +onError(error)
    }
    
    class WebSocketObserver {
        +socket
        +onSearchProgress(stage, message)
        +onSearchComplete(results)
        +onError(error)
    }
    
    class SearchOrchestrator {
        -observers[]
        +attach(observer)
        +detach(observer)
        +notify(event)
        +executeSearch(query)
    }
    
    SearchObserver <|-- WebSocketObserver
    SearchOrchestrator --> SearchObserver
```

### 3. Factory Pattern - AI Service Creation

```mermaid
classDiagram
    class AIServiceFactory {
        <<factory>>
        +createService(type) AIService
    }
    
    class AIService {
        <<interface>>
        +generateText(prompt) string
        +analyzeCredibility(content) Analysis
        +detectBias(text) BiasReport
    }
    
    class VertexAIService {
        +geminiModel
        +generateText(prompt) string
        +analyzeCredibility(content) Analysis
        +detectBias(text) BiasReport
    }
    
    class OpenAIService {
        +gptModel
        +generateText(prompt) string
        +analyzeCredibility(content) Analysis
        +detectBias(text) BiasReport
    }
    
    AIServiceFactory --> AIService
    AIService <|-- VertexAIService
    AIService <|-- OpenAIService
```

### 4. Chain of Responsibility - Content Processing

```mermaid
graph LR
    A[Raw Content] --> B[Deduplication Handler]
    B --> C[Credibility Scorer]
    C --> D[Bias Detector]
    D --> E[Content Filter]
    E --> F[Ranking Handler]
    F --> G[Processed Results]
    
    style A fill:#ffd43b
    style G fill:#51cf66
```

##  Component Interaction Diagram

```mermaid
graph TB
    subgraph "Frontend Components"
        A1[ChatInterface]
        A2[MessageBubble]
        A3[SourcesPanel]
        A4[SearchProgress]
    end
    
    subgraph "Backend Services"
        B1[ConversationController]
        B2[LiveSearchService]
        B3[ElasticService]
        B4[VertexAIService]
        B5[CacheService]
    end
    
    subgraph "Data Sources"
        C1[(Elasticsearch)]
        C2[(Redis)]
        C3[NewsAPI]
        C4[Google Search]
    end
    
    A1 --> B1
    A4 --> B1
    B1 --> B2
    B1 --> B3
    B1 --> B4
    B1 --> B5
    
    B2 --> C3
    B2 --> C4
    B3 --> C1
    B5 --> C2
    
    B4 -.AI Analysis.-> B1
    C1 -.Results.-> B3
    C2 -.Cache.-> B5
    
    style B1 fill:#ffd43b
    style B4 fill:#4285f4
    style C1 fill:#00bfb3
```

##  State Machine - Conversation Flow

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Understanding: User asks question
    Understanding --> Searching: Intent analyzed
    Searching --> Analyzing: Sources found
    Analyzing --> Generating: Credibility assessed
    Generating --> Complete: Response ready
    Complete --> Idle: Display to user
    
    Searching --> Error: API failure
    Analyzing --> Error: AI service down
    Generating --> Error: Generation failed
    Error --> Idle: Show error message
    
    Complete --> Understanding: Follow-up question
```

##  Caching Strategy

```mermaid
graph TD
    A[Request] --> B{Check Redis Cache}
    B -->|Hit| C[Return Cached]
    B -->|Miss| D[Execute Search]
    
    D --> E[Live APIs]
    D --> F[Elasticsearch]
    
    E --> G[Combine Results]
    F --> G
    
    G --> H[AI Analysis]
    H --> I[Generate Response]
    I --> J[Store in Cache<br/>TTL: 1 hour]
    J --> K[Return Response]
    
    C --> L[Track Cache Metrics]
    K --> L
    
    style B fill:#ffd43b
    style J fill:#51cf66
    style L fill:#339af0
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx / Cloud LB]
    end
    
    subgraph "Frontend Tier"
        F1[Frontend Instance 1]
        F2[Frontend Instance 2]
        F3[Frontend Instance 3]
    end
    
    subgraph "Backend Tier"
        B1[Backend Instance 1]
        B2[Backend Instance 2]
        B3[Backend Instance 3]
    end
    
    subgraph "Data Tier"
        E1[(Elasticsearch Node 1)]
        E2[(Elasticsearch Node 2)]
        E3[(Elasticsearch Node 3)]
        R1[(Redis Primary)]
        R2[(Redis Replica)]
    end
    
    subgraph "External Services"
        V[Vertex AI]
        N[NewsAPI]
        G[Google Search]
    end
    
    LB --> F1
    LB --> F2
    LB --> F3
    
    F1 --> B1
    F2 --> B2
    F3 --> B3
    
    B1 --> E1
    B2 --> E2
    B3 --> E3
    
    B1 --> R1
    B2 --> R1
    B3 --> R1
    R1 --> R2
    
    B1 --> V
    B2 --> V
    B3 --> V
    
    B1 --> N
    B2 --> G
    
    style LB fill:#ffd43b
    style V fill:#4285f4
    style E1 fill:#00bfb3
```

##  Performance & Monitoring

### System Metrics Flow

```mermaid
graph LR
    A[Application] --> B[Winston Logger]
    B --> C[Log Files]
    B --> D[Console Output]
    
    E[Elasticsearch] --> F[Cluster Stats]
    G[Redis] --> H[Cache Metrics]
    
    C --> I[Log Aggregator]
    F --> I
    H --> I
    
    I --> J[Monitoring Dashboard]
    J --> K[Alerts]
    
    style A fill:#ffd43b
    style J fill:#51cf66
    style K fill:#ff6b6b
```

### Performance Targets

| Component | Target | Monitoring |
|-----------|--------|------------|
| Search Latency | < 2s | P95 response time |
| AI Response | < 5s | P95 generation time |
| Cache Hit Rate | > 70% | Redis stats |
| API Availability | > 99% | Health checks |
| Concurrent Users | 100+/instance | Connection count |

##  Security Architecture

```mermaid
graph TB
    A[Client Request] --> B[Rate Limiter]
    B --> C[CORS Validation]
    C --> D[Input Sanitization]
    D --> E[Authentication<br/>Optional]
    E --> F[Authorization<br/>Optional]
    F --> G[API Logic]
    G --> H[Output Sanitization]
    H --> I[Response]
    
    B -.Block.-> J[429 Too Many Requests]
    C -.Block.-> K[403 Forbidden]
    D -.Block.-> L[400 Bad Request]
    E -.Block.-> M[401 Unauthorized]
    F -.Block.-> N[403 Forbidden]
    
    style B fill:#ff6b6b
    style D fill:#ffd43b
    style G fill:#51cf66
```


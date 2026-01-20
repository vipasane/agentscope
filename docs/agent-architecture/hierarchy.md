```mermaid
graph TB
    %% Agent Hierarchy

    _code_analyzer_[""code-analyzer""]
    analyst["analyst"]
    _system_architect_[""system-architect""]
    byzantine_coordinator[["byzantine-coordinator"]]
    crdt_synchronizer["crdt-synchronizer"]
    gossip_coordinator[["gossip-coordinator"]]
    performance_benchmarker["performance-benchmarker"]
    quorum_manager[["quorum-manager"]]
    raft_manager[["raft-manager"]]
    security_manager["security-manager"]
    coder["coder"]
    planner[["planner"]]
    researcher["researcher"]
    reviewer["reviewer"]
    tester["tester"]
    test_long_runner["test-long-runner"]
    _ml_developer_[""ml-developer""]
    _backend_dev_[""backend-dev""]
    _cicd_engineer_[""cicd-engineer""]
    _api_docs_[""api-docs""]
    flow_nexus_app_store["flow-nexus-app-store"]
    flow_nexus_auth["flow-nexus-auth"]
    flow_nexus_challenges["flow-nexus-challenges"]
    flow_nexus_neural["flow-nexus-neural"]
    flow_nexus_payments["flow-nexus-payments"]
    flow_nexus_sandbox["flow-nexus-sandbox"]
    flow_nexus_swarm["flow-nexus-swarm"]
    flow_nexus_user_tools["flow-nexus-user-tools"]
    flow_nexus_workflow["flow-nexus-workflow"]
    code_review_swarm["code-review-swarm"]
    github_modes["github-modes"]
    issue_tracker["issue-tracker"]
    multi_repo_swarm["multi-repo-swarm"]
    pr_manager["pr-manager"]
    project_board_sync["project-board-sync"]
    release_manager["release-manager"]
    release_swarm["release-swarm"]
    repo_architect["repo-architect"]
    swarm_issue["swarm-issue"]
    swarm_pr["swarm-pr"]
    sync_coordinator["sync-coordinator"]
    workflow_automation["workflow-automation"]
    sublinear_goal_planner["sublinear-goal-planner"]
    goal_planner["goal-planner"]
    Benchmark_Suite["Benchmark Suite"]
    Load_Balancing_Coordinator["Load Balancing Coordinator"]
    Performance_Monitor["Performance Monitor"]
    Resource_Allocator["Resource Allocator"]
    Topology_Optimizer["Topology Optimizer"]
    agentic_payments["agentic-payments"]
    sona_learning_optimizer["sona-learning-optimizer"]
    architecture["architecture"]
    pseudocode["pseudocode"]
    refinement["refinement"]
    specification["specification"]
    _mobile_dev_[""mobile-dev""]
    consensus_coordinator[["consensus-coordinator"]]
    matrix_optimizer["matrix-optimizer"]
    pagerank_analyzer["pagerank-analyzer"]
    performance_optimizer["performance-optimizer"]
    trading_predictor["trading-predictor"]
    adaptive_coordinator[["adaptive-coordinator"]]
    hierarchical_coordinator[["hierarchical-coordinator"]]
    mesh_coordinator[["mesh-coordinator"]]
    smart_agent["smart-agent"]
    base_template_generator["base-template-generator"]
    swarm_init["swarm-init"]
    sparc_coder["sparc-coder"]
    memory_coordinator["memory-coordinator"]
    task_orchestrator["task-orchestrator"]
    perf_analyzer["perf-analyzer"]
    sparc_coord["sparc-coord"]
    production_validator["production-validator"]
    tdd_london_swarm["tdd-london-swarm"]
    adr_architect["adr-architect"]
    aidefence_guardian["aidefence-guardian"]
    claims_authorizer["claims-authorizer"]
    collective_intelligence_coordinator[["collective-intelligence-coordinator"]]
    ddd_domain_expert["ddd-domain-expert"]
    injection_analyst["injection-analyst"]
    memory_specialist(["memory-specialist"])
    performance_engineer["performance-engineer"]
    pii_detector["pii-detector"]
    reasoningbank_learner(["reasoningbank-learner"])
    security_architect_aidefence["security-architect-aidefence"]
    security_architect["security-architect"]
    security_auditor["security-auditor"]
    sparc_orchestrator[["sparc-orchestrator"]]
    swarm_memory_manager[["swarm-memory-manager"]]
    v3_integration_architect["v3-integration-architect"]
    Tier["Tier"]
    Cost["Cost"]
    Haiku["Haiku"]
    Trigger["Trigger"]
    optimize["optimize"]
    testgaps["testgaps"]
    audit["audit"]
    document["document"]
    map["map"]
    deepdive["deepdive"]
    Code["Code"]
    Command["Command"]
    init["init"]
    swarm["swarm"]
    memory["memory"]
    mcp["mcp"]
    task["task"]
    session["session"]
    config["config"]
    status["status"]
    workflow["workflow"]
    hooks["hooks"]
    daemon["daemon"]
    neural["neural"]
    security["security"]
    performance["performance"]
    providers["providers"]
    plugins["plugins"]
    deployment["deployment"]
    embeddings["embeddings"]
    claims["claims"]
    migrate["migrate"]
    doctor["doctor"]
    completions["completions"]
    Hook["Hook"]
    route["route"]
    explain["explain"]
    pretrain["pretrain"]
    metrics["metrics"]
    transfer["transfer"]
    list["list"]
    intelligence["intelligence"]
    worker["worker"]
    progress["progress"]
    statusline["statusline"]
    Worker["Worker"]
    ultralearn["ultralearn"]
    consolidate["consolidate"]
    predict["predict"]
    preload["preload"]
    refactor["refactor"]
    benchmark["benchmark"]
    Metric["Metric"]
    Condition["Condition"]

    %% Delegation Relationships

    %% Skills
    skill__AgentDB_Advanced_Features_([""AgentDB Advanced Features""])
    skill__AgentDB_Learning_Plugins_([""AgentDB Learning Plugins""])
    plugins -->|uses| skill__AgentDB_Learning_Plugins_
    skill__AgentDB_Memory_Patterns_([""AgentDB Memory Patterns""])
    memory -->|uses| skill__AgentDB_Memory_Patterns_
    skill__AgentDB_Performance_Optimization_([""AgentDB Performance Optimization""])
    performance -->|uses| skill__AgentDB_Performance_Optimization_
    skill__AgentDB_Vector_Search_([""AgentDB Vector Search""])
    skill_github_code_review(["github-code-review"])
    Code -->|uses| skill_github_code_review
    skill_github_multi_repo(["github-multi-repo"])
    skill_github_project_management(["github-project-management"])
    skill_github_release_management(["github-release-management"])
    skill_github_workflow_automation(["github-workflow-automation"])
    workflow_automation -->|uses| skill_github_workflow_automation
    workflow -->|uses| skill_github_workflow_automation
    skill_Hooks_Automation(["Hooks Automation"])
    hooks -->|uses| skill_Hooks_Automation
    Hook -->|uses| skill_Hooks_Automation
    skill_Pair_Programming(["Pair Programming"])
    skill__ReasoningBank_with_AgentDB_([""ReasoningBank with AgentDB""])
    skill__ReasoningBank_Intelligence_([""ReasoningBank Intelligence""])
    intelligence -->|uses| skill__ReasoningBank_Intelligence_
    skill__Skill_Builder_([""Skill Builder""])
    skill_sparc_methodology(["sparc-methodology"])
    skill_stream_chain(["stream-chain"])
    skill_swarm_advanced(["swarm-advanced"])
    swarm -->|uses| skill_swarm_advanced
    skill__Swarm_Orchestration_([""Swarm Orchestration""])
    swarm -->|uses| skill__Swarm_Orchestration_
    skill__V3_CLI_Modernization_([""V3 CLI Modernization""])
    skill__V3_Core_Implementation_([""V3 Core Implementation""])
    skill__V3_DDD_Architecture_([""V3 DDD Architecture""])
    architecture -->|uses| skill__V3_DDD_Architecture_
    skill__V3_Deep_Integration_([""V3 Deep Integration""])
    skill__V3_MCP_Optimization_([""V3 MCP Optimization""])
    mcp -->|uses| skill__V3_MCP_Optimization_
    skill__V3_Memory_Unification_([""V3 Memory Unification""])
    memory -->|uses| skill__V3_Memory_Unification_
    skill__V3_Performance_Optimization_([""V3 Performance Optimization""])
    performance -->|uses| skill__V3_Performance_Optimization_
    skill__V3_Security_Overhaul_([""V3 Security Overhaul""])
    security -->|uses| skill__V3_Security_Overhaul_
    skill__V3_Swarm_Coordination_([""V3 Swarm Coordination""])
    swarm -->|uses| skill__V3_Swarm_Coordination_
    skill__Verification___Quality_Assurance_([""Verification & Quality Assurance""])

    %% Styling
    classDef coordinator fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    classDef worker fill:#f3e5f5,stroke:#4a148c
    classDef reviewer fill:#fff3e0,stroke:#e65100
    classDef specialist fill:#e8f5e9,stroke:#1b5e20
    classDef skill fill:#e3f2fd,stroke:#0d47a1,stroke-dasharray: 5 5
    class _code_analyzer_ "analysis"
    class analyst code-analyzer
    class _code_analyzer_ "analysis"
    class _system_architect_ "architecture"
    class _system_architect_ "architecture"
    class byzantine_coordinator coordinator
    class crdt_synchronizer synchronizer
    class gossip_coordinator coordinator
    class performance_benchmarker analyst
    class quorum_manager coordinator
    class raft_manager coordinator
    class security_manager security
    class coder developer
    class planner coordinator
    class researcher analyst
    class reviewer validator
    class tester validator
    class test_long_runner worker
    class _ml_developer_ "data"
    class _ml_developer_ "data"
    class _backend_dev_ "development"
    class _backend_dev_ "development"
    class _cicd_engineer_ "devops"
    class _cicd_engineer_ "devops"
    class _api_docs_ "documentation"
    class _api_docs_ "documentation"
    class flow_nexus_app_store worker
    class flow_nexus_auth worker
    class flow_nexus_challenges worker
    class flow_nexus_neural worker
    class flow_nexus_payments worker
    class flow_nexus_sandbox worker
    class flow_nexus_swarm worker
    class flow_nexus_user_tools worker
    class flow_nexus_workflow worker
    class code_review_swarm development
    class github_modes development
    class issue_tracker development
    class multi_repo_swarm coordination
    class pr_manager development
    class project_board_sync coordination
    class release_manager development
    class release_swarm coordination
    class repo_architect architecture
    class swarm_issue coordination
    class swarm_pr development
    class sync_coordinator coordination
    class workflow_automation automation
    class sublinear_goal_planner worker
    class goal_planner worker
    class Benchmark_Suite agent
    class Load_Balancing_Coordinator agent
    class Performance_Monitor agent
    class Resource_Allocator agent
    class Topology_Optimizer agent
    class agentic_payments worker
    class sona_learning_optimizer adaptive-learning
    class architecture architect
    class pseudocode architect
    class refinement developer
    class specification analyst
    class _mobile_dev_ "specialized"
    class _mobile_dev_ "specialized"
    class consensus_coordinator coordinator
    class matrix_optimizer worker
    class pagerank_analyzer worker
    class performance_optimizer worker
    class trading_predictor worker
    class adaptive_coordinator coordinator
    class hierarchical_coordinator coordinator
    class mesh_coordinator coordinator
    class smart_agent automation
    class base_template_generator worker
    class swarm_init coordination
    class pr_manager development
    class sparc_coder development
    class memory_coordinator coordination
    class task_orchestrator orchestration
    class perf_analyzer analysis
    class sparc_coord coordination
    class production_validator validator
    class tdd_london_swarm tester
    class adr_architect architect
    class aidefence_guardian security
    class claims_authorizer security
    class collective_intelligence_coordinator coordinator
    class ddd_domain_expert architect
    class injection_analyst security
    class memory_specialist specialist
    class performance_engineer optimization
    class pii_detector security
    class reasoningbank_learner specialist
    class security_architect_aidefence security
    class security_architect security
    class security_auditor security
    class sparc_orchestrator coordinator
    class swarm_memory_manager coordinator
    class v3_integration_architect architect
    class Tier worker
    class Cost worker
    class Haiku worker
    class Trigger worker
    class optimize worker
    class testgaps worker
    class audit worker
    class document worker
    class map worker
    class deepdive worker
    class Code worker
    class Command worker
    class init worker
    class swarm worker
    class memory worker
    class mcp worker
    class task worker
    class session worker
    class config worker
    class status worker
    class workflow worker
    class hooks worker
    class Command worker
    class daemon worker
    class neural worker
    class security worker
    class performance worker
    class providers worker
    class plugins worker
    class deployment worker
    class embeddings worker
    class claims worker
    class migrate worker
    class doctor worker
    class completions worker
    class Hook worker
    class route worker
    class explain worker
    class pretrain worker
    class metrics worker
    class transfer worker
    class list worker
    class intelligence worker
    class worker worker
    class progress worker
    class statusline worker
    class Worker worker
    class ultralearn worker
    class optimize worker
    class consolidate worker
    class predict worker
    class audit worker
    class map worker
    class preload worker
    class deepdive worker
    class document worker
    class refactor worker
    class benchmark worker
    class testgaps worker
    class Metric worker
    class Condition worker
    class skill__AgentDB_Advanced_Features_ skill
    class skill__AgentDB_Learning_Plugins_ skill
    class skill__AgentDB_Memory_Patterns_ skill
    class skill__AgentDB_Performance_Optimization_ skill
    class skill__AgentDB_Vector_Search_ skill
    class skill_github_code_review skill
    class skill_github_multi_repo skill
    class skill_github_project_management skill
    class skill_github_release_management skill
    class skill_github_workflow_automation skill
    class skill_Hooks_Automation skill
    class skill_Pair_Programming skill
    class skill__ReasoningBank_with_AgentDB_ skill
    class skill__ReasoningBank_Intelligence_ skill
    class skill__Skill_Builder_ skill
    class skill_sparc_methodology skill
    class skill_stream_chain skill
    class skill_swarm_advanced skill
    class skill__Swarm_Orchestration_ skill
    class skill__V3_CLI_Modernization_ skill
    class skill__V3_Core_Implementation_ skill
    class skill__V3_DDD_Architecture_ skill
    class skill__V3_Deep_Integration_ skill
    class skill__V3_MCP_Optimization_ skill
    class skill__V3_Memory_Unification_ skill
    class skill__V3_Performance_Optimization_ skill
    class skill__V3_Security_Overhaul_ skill
    class skill__V3_Swarm_Coordination_ skill
    class skill__Verification___Quality_Assurance_ skill
```
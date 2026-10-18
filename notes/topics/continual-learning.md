# Continual learning

My running notes on continual learning: how a model can keep learning new things after deployment without losing what it already knows. Individual papers and talks get their own notes; this page is the hub.

## The problem in one line

Every update that adds knowledge to the weights risks destroying old knowledge (**catastrophic forgetting**), and every safeguard against forgetting makes the model less able to learn (**stability–plasticity dilemma**).

## Core ideas so far

- **Three places to put new knowledge** (from my [KB/KG overview](https://claude.ai/artifact/NXd9v4kxd3TWXNjBvenphY), §21): in the **weights** (fine-tuning, editing), in a **symbolic store** (knowledge graph updates), or in **context** (RAG, memory). Weights generalise but forget; stores are precise but need retrieval and reasoning; context is flexible but bounded. Continual learning research is mostly about the first.
- **SFT vs RL is the central trade-off for LLMs.** SFT can inject genuinely new knowledge but is off-policy and forgets; RL is on-policy and forgets little but can only upweight behaviour the model already samples. See [Why Nobody Has Solved Continual Learning](../talks/why-nobody-has-solved-continual-learning.md).
- **Distillation warm-starts RL.** SFT on a teacher's traces raises pass@k from ~0 to something RL can amplify, which matters most in hard, sparse-reward environments. It can, however, lower the final plateau.
- **Real pipelines alternate:** SFT → RL → SFT → RL. Very effective for narrow tasks; loses efficacy for general agents because forgetting accumulates.
- **The classic toolbox** against forgetting: replay (store and re-train on old data), regularisation (EWC and KL penalties toward old weights), parameter isolation (adapters, sparse updates). Each reduces forgetting without eliminating it.
- **Symbolic analogue:** keeping derived facts consistent when base facts change (incremental reasoning, DRed) is the KG version of the same problem (overview §16).

## Sources

| Source | Kind | Key takeaway |
| --- | --- | --- |
| [Why Nobody Has Solved Continual Learning](../talks/why-nobody-has-solved-continual-learning.md), Charlie O'Neill (LangChain, 2026) | Talk | The method that adds knowledge (SFT) forgets; the method that doesn't forget (RL) can't add knowledge. Tune the SFT:RL ratio to how narrow the task is. |
| [Knowledge Bases & Knowledge Graphs overview](https://claude.ai/artifact/NXd9v4kxd3TWXNjBvenphY) (private link; §21 and §24) | My overview | The weights / store / context split, and continual KG embeddings (LKGE) use the same toolbox. |

## Open questions

- Can on-policy or self-distillation inject new knowledge with RL-level forgetting?
- How much SFT forgetting is "spurious" (format and alignment loss that RL repairs quickly) versus genuine knowledge loss?
- Where is the line between "put it in the weights" and "put it in a KG / retrieval layer"?
- Will the answer be architectural (sparse memory layers, test-time learning, Titans-style memory) rather than a better training schedule?

## Next on the reading list

Three Scenarios for Continual Learning · Overcoming Catastrophic Forgetting (EWC) · Spurious Forgetting in Continual Learning of LMs · Self-Distillation Enables Continual Learning · Continual Learning via Sparse Memory Finetuning · RL's Razor

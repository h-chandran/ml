# Why Nobody Has Solved Continual Learning

**Talk:** Charlie O'Neill (Co-Head of Model Training, Baseten), at *LangChain Presents: The Learning Loop*, San Francisco
**Video:** [youtube.com/watch?v=whnDiwcL4HE](https://www.youtube.com/watch?v=whnDiwcL4HE) (LangChain, published 2026-10-16)
**Watched:** 2026-10
**Concepts:** learning loop · SFT · RL · on-policy vs off-policy · distillation · self-distillation · catastrophic forgetting · pass@k

> **How these notes were made.** They start from my own notes while watching. They were then expanded using the video's chapter list and description, and filled in with well-established background where the talk only gestured at something. Anything marked *(background)* is context I added, not a claim from the talk; anything marked *(inferred)* is my best reading of a chapter title where I don't have the exact argument. No transcript was used.

---

## The one-paragraph version

Everyone building agents wants a **learning loop**: deploy a model, collect traces and feedback from real use, train on them, redeploy, repeat. Every box in that loop is tractable except the **train** box. The two tools we have pull in opposite directions. **SFT** can put genuinely new knowledge and behaviour into a model, but it is off-policy and, applied over and over, it erodes what the model already knew (catastrophic forgetting). **RL** is on-policy and forgets far less, but it can only reinforce things the model already does sometimes, so it is bad at teaching new facts. Real pipelines alternate the two (SFT → RL → SFT → RL …). That works very well when the target task is **narrow**, and degrades for **general** agents, where every round of SFT chips away at breadth. Nobody has a recipe that keeps adding knowledge indefinitely without paying that tax, which is why continual learning is "not solved".

---

## 1. The learning loop and its unsolved train box (0:00)

- The loop: **serve → observe (traces, user feedback, failures) → train → evaluate → serve**.
- Observability, data collection and evaluation are engineering problems that teams already handle. The **training step** is the open research problem once you do it repeatedly rather than once.
- Doing it *once* is ordinary fine-tuning. Doing it *continually* means each update must (a) add the new thing and (b) not destroy everything learned before. That second requirement is the whole difficulty.

## 2. SFT: what it can do that RL can't (2:04)

**Supervised fine-tuning** = maximise the likelihood of demonstration tokens (next-token cross-entropy on someone else's outputs: a human, a stronger model, a curated dataset).

- **It can move a model beyond its current capabilities.** Because the targets come from outside the model, SFT can teach facts, formats, and reasoning patterns the model would essentially never produce on its own. My note from the talk: you can SFT a small model such as **Qwen-3B** on solution traces and get it to attempt IMO-style problems it could not touch before. RL could never get there from scratch, because a reward that is never earned carries no gradient.
- It is **sample-efficient and stable**: a dense, token-level signal on every position, no sampling, no reward model, no variance from rollouts.
- It is the natural tool for **knowledge injection**: new docs, a new API, a company's internal conventions.

## 3. Why off-policy SFT breaks on production edge cases (3:13)

- SFT is **off-policy**: the model learns from trajectories it did not generate. At inference time it conditions on *its own* previous tokens, which will drift from the demonstrations.
- Once the model makes a small mistake it is in a state the training data never covered, so it has no idea how to recover, and errors **compound**. This is the classic imitation-learning problem (behaviour cloning / exposure bias). The talk cites **DAgger** (Ross, Gordon & Bagnell, 2011), whose fix is to roll out the *learner's* policy, have the expert label the states the learner actually visits, and train on those.
- In production, this shows up as **edge cases**: the long tail of inputs where the fine-tuned model was never shown how to behave and falls apart, often worse than before fine-tuning. *(inferred from chapter title)*

## 4. RL stays on-policy but can only upweight what it samples (4:30)

**Reinforcement learning** (for LLMs: PPO/GRPO-style policy gradients on verifiable or learned rewards) samples the model's own outputs, scores them, and pushes probability toward the better ones.

- **On-policy** → it trains on exactly the states the model will visit, so no exposure-bias problem, and it learns to recover from its own mistakes.
- **But it can only reweight.** If the correct behaviour has ~0 probability under the current model, it never gets sampled, never gets rewarded, and RL cannot find it. RL *sharpens* the distribution toward the good parts of what's already there.
- Practical diagnostic: **pass@k** on the task. If pass@k is ~0 even for large *k*, RL has nothing to work with. *(background)* Yue et al. (2025) found that RL-trained reasoning models beat their base models at pass@1 but the base models catch up or win at large *k*. That fits the "RL redistributes, doesn't create" picture.

## 5. Distillation as a warm start for RL (6:14)

How open-weight labs actually train strong small models:

1. **Distil first.** SFT the student on outputs from a stronger teacher (reasoning traces, tool-use trajectories). This is distillation in the modern sense: sequence-level imitation of a teacher, rather than Hinton-style matching of soft logits, though the goal is the same.
2. **Then RL.** With a higher starting point, the student now *sometimes* succeeds, so RL has signal to amplify.

Why it matters:

- RL compute is dominated by rollouts. If initial pass@k on the curriculum is very low, you burn enormous compute before you see any reward. Distillation buys a starting point where **reward is dense enough to learn from**.
- This matters most for **complex RL environments** (long-horizon agentic tasks, multi-step tool use, hard maths) where a cold model essentially never reaches the reward.
- *(background)* DeepSeek-R1 (2025) is the canonical example: a small "cold-start" SFT set before RL, and distilled Qwen/Llama students trained purely by SFT on R1 outputs.

## 6. Distilled models start higher but plateau lower (8:09)

The counter-intuitive result Baseten replicated: **a distillation warm start begins higher but plateaus lower than RL alone** (on a task where RL alone can get going).

My reading of why *(inferred)*:

- Distillation pulls the student toward the **teacher's** distribution, which is off-policy for the student and may contain strategies the student can't execute reliably. RL then has to work from that shifted, partly ill-fitting starting point.
- It may also reduce diversity/entropy early, so RL has less to explore.
- So the SFT warm start is a **trade**: faster early progress and feasibility on hard tasks, possibly at the cost of the ceiling. It is necessary when RL can't start at all, and potentially harmful when it can.

## 7. Continual learning: what breaks when you keep SFTing (9:42)

The pipeline everyone converges on:

```
base → SFT (inject new knowledge / behaviour) → RL (sharpen on-policy, repair)
     → SFT (next batch of new knowledge)       → RL → …
```

What goes wrong as rounds accumulate:

- **Catastrophic forgetting.** Each SFT round moves weights toward the new data with nothing anchoring the old. Performance on earlier tasks and on general capabilities (reasoning, instruction following, safety behaviour, formatting) erodes.
- **Off-policy drift compounds.** Each round trains on data from somewhere else, so the model's own distribution keeps getting pulled around.
- The usual mitigations *(background)*: **replay** (mix in old/general data), **regularisation** toward earlier weights (EWC, KL penalties), **parameter isolation** (LoRA adapters, sparse updates). They reduce the damage but don't remove it, and replay gets expensive as the history grows.

## 8. Why RL forgets less but struggles to bake in knowledge (12:55)

- RL updates stay close to the current model because they only reweight its own samples. *(background)* Shenfeld, Pari & Agrawal, "RL's Razor" (2025): the amount of forgetting is well predicted by the KL divergence between the fine-tuned and base model on the new task's distribution, and on-policy RL implicitly finds low-KL solutions. SFT can land far away.
- The flip side: **facts are not something you can reward your way into.** If the model doesn't know a new API or a new document, RL has nothing to upweight. Knowledge has to come in through supervised signal (or through context).
- That's the core tension: **the method that adds knowledge forgets; the method that doesn't forget can't add knowledge.**

## 9. Self-distillation hints and the bias problem (14:35)

One proposed escape: get SFT-like knowledge injection with RL-like on-policy-ness by having the model **teach itself**.

- Give the model a **hint** or privileged information in context (the relevant document, the correct answer, a worked example). With the hint, it can produce good outputs. Then train the model *without* the hint to match its own hinted outputs. The targets come from (nearly) the model's own distribution, so the update is closer to on-policy and should forget less. *(background)* Related ideas: context distillation (Snell et al., 2022), Cartridges' "self-study" (Eyuboglu et al., 2025, linked from the talk), and *Self-Distillation Enables Continual Learning* (Shenfeld et al., 2026, on my reading list).
- **The bias problem** *(inferred)*: the hinted teacher is not the same distribution as the un-hinted student. The outputs can leak the hint ("as the document says…"), lean on information the student won't have, or teach the student to be over-confident. So the student learns a biased target. That's less damaging than fully off-policy SFT, but still not free.

## 10. Narrow tasks vs general agents like Cursor and Harvey (15:27)

- For a **narrow task** (one extraction format, one domain's tool calls, one classifier-like job), the SFT ⇄ RL loop is **extremely effective**. You don't care that the model forgot how to write poetry; the task distribution is small enough to cover with data and evals.
- For **general agents** (Cursor for coding, Harvey for legal work), the product depends on breadth. Each round of specialisation risks degrading the general capabilities users rely on, and the space of "everything else" is too large to protect with replay or evals. Here continual learning **loses efficacy because of catastrophic forgetting**.
- The narrower the task, the more aggressively you can train; the more general, the more you must hold back.

## 11. Frontier labs already run this loop, just slowly (17:47)

- Viewed from far enough away, frontier labs already do continual learning: each model release is one turn of the loop (collect usage data and failures → new SFT/RL mixtures → new model).
- They do it at a cadence of months, with huge eval suites and the option of retraining large parts of the pipeline, which side-steps forgetting by brute force rather than solving it. *(inferred)*
- The unsolved version is doing it **fast, cheaply, and incrementally**: per customer, per week, without a full retrain.

## 12. Most teams sit in the middle: tune your SFT-to-RL ratio (18:46)

The practical takeaway is a dial rather than a choice:

| If your situation is… | Lean toward |
| --- | --- |
| Model lacks knowledge/skills entirely (pass@k ≈ 0) | More SFT / distillation |
| Model can sometimes do it; you need reliability | More RL |
| Narrow task, breadth doesn't matter | Aggressive SFT → RL cycles |
| General product, breadth is the value | Light SFT, RL-heavy, replay, strong regression evals |
| Facts change often | Keep them out of the weights (RAG / KG / memory) |

---

## How this connects to the rest of my notes

- **Three places to put knowledge.** The [KB/KG overview](https://claude.ai/artifact/NXd9v4kxd3TWXNjBvenphY) (§21, "Language models as knowledge bases") splits new knowledge into *weights*, *symbolic store* (KG), and *context* (RAG). This talk is a detailed account of why the weights option is hard: SFT is the only reliable way in, and it forgets. It strengthens the case for putting volatile facts in a KG or retrieval layer and reserving weight updates for skills.
- **Knowledge editing** (overview §21): long sequences of ROME/MEMIT edits collapse the model. That is the same forgetting story at the scale of single facts.
- **Continual KG embeddings** (overview §24): replay, regularisation and embedding transfer are the same toolbox as in §7 above.
- **Stability–plasticity.** SFT is the plastic, unstable option; RL is the stable, inflexible one. The talk is a modern LLM version of this old dilemma.

## Questions to follow up

- What exactly was the Baseten replication (task, model size, distillation data)? How does it square with DeepSeek-R1's finding that distillation beat RL for small models?
- Does on-policy distillation (student samples, teacher grades per token) get the best of both: new knowledge *and* low forgetting?
- How much of SFT forgetting is "spurious" (format/alignment loss that a little RL repairs) versus real knowledge loss? See *Spurious Forgetting in Continual Learning of Language Models* on the reading list.
- *Can a Language Model Learn Facts Continually in Its Weights?* (O'Neill et al., 2026) is on my reading list. Check whether it's the same Charlie O'Neill; if so it's probably the paper behind much of this talk. *(inferred)*
- Is the right long-term answer architectural (sparse memory layers, test-time learning) rather than a better SFT/RL schedule?

## Further reading (linked from the talk or directly relevant)

- Ross, Gordon & Bagnell, *A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning* (DAgger), 2011, [arXiv:1011.0686](https://arxiv.org/abs/1011.0686), linked from the talk
- Eyuboglu et al., *Cartridges: Lightweight and General-Purpose Long Context Representations via Self-Study*, 2025, [arXiv:2506.06266](https://arxiv.org/abs/2506.06266), linked from the talk
- Shenfeld, Pari & Agrawal, *RL's Razor: Why Online Reinforcement Learning Forgets Less*, 2025, [arXiv:2509.04259](https://arxiv.org/abs/2509.04259) *(background)*
- Yue et al., *Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?*, 2025, [arXiv:2504.13837](https://arxiv.org/abs/2504.13837) *(background)*
- DeepSeek-AI, *DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning*, 2025, [arXiv:2501.12948](https://arxiv.org/abs/2501.12948) *(background)*

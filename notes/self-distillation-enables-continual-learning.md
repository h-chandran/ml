# Self-Distillation Enables Continual Learning

**Paper:** Idan Shenfeld, Mehul Damani, Jonas Hübotter & Pulkit Agrawal (MIT, ETH Zurich), 2026
**Links:** [arXiv 2601.19897](https://arxiv.org/abs/2601.19897) · [HTML](https://arxiv.org/html/2601.19897v1) · [code and data](http://idanshenfeld.com/SDFT)
**Status:** on my reading list (not yet read in full)
**Concepts:** self-distillation · on-policy vs off-policy · catastrophic forgetting · SFT · knowledge injection

> **How these notes were made.** A first-pass summary of the paper's main text (v1, 27 Jan 2026), written before I read it closely. The appendices (algorithm box, hyperparameters, estimator and teacher ablations) are not covered yet. Replace with my own reading once done.

---

## The one-paragraph version

SFT on expert demonstrations is off-policy and forgets; on-policy RL forgets far less but needs a reward. **SDFT (Self-Distillation Fine-Tuning)** gets on-policy learning from demonstrations alone. The same model plays two roles: the **teacher** sees the query *plus* a demonstration in context, the **student** sees only the query. The student samples its own response, and is trained with **reverse KL** toward the teacher's token distribution on that response. Because the targets are the model's own (demonstration-conditioned) distribution, evaluated on the student's own samples, the update stays close to the base policy and forgets much less than SFT, while still learning new skills and new facts.

## Method

- **Student:** π_θ(· | x), the model with just the query.
- **Teacher:** π(· | x, c), the same model with the query and an expert demonstration c, wrapped in a template that says "here is an example response, now give your own answer with your reasoning". The framing is what stops the teacher from copying c verbatim.
- **Teacher weights:** by default an EMA of the student's parameters (teacher choices are in Appendix A.3).
- **Rollouts:** one on-policy sample per prompt (cheaper than GRPO-style groups).
- **Loss:** D_KL(π_θ(· | x) ‖ π(· | x, c)), computed token by token on the student's sample, teacher held fixed.
- **Why it should work (Section 3.1):** start from trust-region RL, where the optimal next policy is a reward-tilted version of the current one. Assume the demonstration-conditioned model approximates that optimal policy (the "in-context assumption"). Then there is an implicit token-level reward log π(y | x, c) − log π_k(y | x), and the reverse-KL gradient equals the policy gradient for it in expectation. So SDFT is RL with a reward the model writes for itself from the demonstration.
- **Sanity check (ToolAlpaca, Qwen2.5-7B-Instruct):** base model solves 42%, the demonstration-conditioned teacher solves 100%, and the teacher is closer to the base model than an SFT model is (KL 0.68 vs 1.26 nats).

## Setup

- **Model:** Qwen2.5-7B-Instruct unless noted (plus 3B/14B for scale, Olmo-3-7B-Think for reasoning).
- **Skill learning:** Science Q&A (SciKnowEval Chemistry L-3), Tool use (ToolAlpaca), Medical (HuatuoGPT-o1).
- **Knowledge acquisition:** ~200K tokens of Wikipedia on 2025 natural disasters (after the cutoff), turned into QA pairs.
- **Forgetting measured on:** HellaSwag, TruthfulQA, MMLU, IFEval, Winogrande, HumanEval (averaged).
- **Baselines:** SFT, DFT, Re-invocation (SFT then on-policy distillation from the base model on general prompts); for knowledge, continual pretraining, SFT, and oracle RAG.

## Results

**Knowledge acquisition:**

| Method | Strict | Lenient | OOD |
| --- | --- | --- | --- |
| Base | 0 | 0 | 0 |
| Oracle RAG | 91 | 100 | 100 |
| CPT | 9 | 37 | 7 |
| SFT | 80 | 95 | 80 |
| SDFT | 89 | 100 | 98 |

SDFT nearly matches oracle RAG, and the gap to SFT is biggest out of distribution (98 vs 80).

- **Skill learning:** higher new-task accuracy than SFT, and the only method that improves the new task without a significant drop on the prior-capability benchmarks. pass@k gains hold up to k = 128, so it is learning the skill, not just collapsing entropy.
- **Sequential learning:** one model learns three skills in a row. SDFT accumulates them; SFT oscillates and interferes with earlier skills. This is the actual continual learning result.
- **Scale:** the advantage grows with model size. At 3B SDFT is *worse* than SFT, at 7B it is ~4 points better, at 14B ~7 points. It depends on the model being good at in-context learning.
- **Reasoning without reasoning data (Olmo-3-7B-Think, medical):** base 31.2%, SFT 23.5% (and shorter answers), SDFT 43.7% with reasoning length mostly kept. SFT on answer-only data destroys the thinking; SDFT doesn't.
- **On-policy matters:** SFT on teacher outputs and offline KL distillation on teacher outputs both beat plain SFT but lose to SDFT. A better teacher alone isn't the whole story.

## Limitations

- ~2.5× the FLOPs and ~4× the wall-clock of SFT (on-policy rollouts).
- The student can pick up teacher tics like "Based on the text…"; they mask the loss on the first few tokens, which is a heuristic.
- Needs strong in-context learning, so it doesn't help small models.
- Hard to induce big behavioural shifts, such as turning a non-reasoning model into a chain-of-thought one.
- Some forgetting remains; and it assumes expert demonstrations, not noisy data.
- Complementary to RL: can be used to initialise RL.

## How it connects

- It is a concrete answer to the open question in my [continual learning hub](topics/continual-learning.md): *can on-policy or self-distillation inject new knowledge with RL-level forgetting?* On these benchmarks, mostly yes.
- Same first author as **RL's Razor** (forgetting tracks KL to the base model, and on-policy RL finds low-KL solutions). SDFT is the follow-up: get a low-KL, on-policy update without needing a reward.
- It is the "hinted self-distillation" idea from [O'Neill's talk](talks/why-nobody-has-solved-continual-learning.md), done carefully. The talk's worry was that the hinted teacher is biased; the spurious-phrase artifact is one visible form of that bias.
- Cousins: context distillation (Snell et al., 2022), Cartridges' self-study (Eyuboglu et al., 2025), DAgger (the student visits its own states, the expert labels them).

## Questions to answer when I read it

- What do the appendix ablations on the teacher (EMA vs frozen base vs current student) show?
- How much does the template wording matter?
- How does it do over many more than three sequential tasks, and on knowledge that conflicts with what the model already believes?

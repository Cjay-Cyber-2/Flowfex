---
title: "Llama 3.2 Fine-tuning"
category: "llm-finetuning"
tags:
  - ai
  - fine-tuning
  - llama
  - sft
  - training
description: "Fine-tune Meta Llama 3.2 on domain-specific datasets with SFT."
---

# Llama 3.2 Fine-tuning

Fine-tune Meta Llama 3.2 on domain-specific datasets with SFT.

## Overview
Supervised fine-tuning of Llama 3.2 with memory-efficient training.

## Instructions
- Format dataset using Llama 3.2 chat template
- Use TRL SFTTrainer for instruction fine-tuning
- Apply bitsandbytes 4-bit quantization
- Configure PEFT LoRA adapters
- Set lr=2e-4, epochs=3, warmup_ratio=0.03
- Enable gradient accumulation for large batch training
- Push fine-tuned adapter to Hugging Face Hub

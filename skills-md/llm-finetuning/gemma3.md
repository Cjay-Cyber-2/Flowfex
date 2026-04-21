---
title: "Gemma 3 Fine-tuning"
category: "llm-finetuning"
tags:
  - ai
  - fine-tuning
  - gemma
  - lora
  - training
description: "Fine-tune Google Gemma 3 on custom datasets using LoRA and QLoRA."
---

# Gemma 3 Fine-tuning

Fine-tune Google Gemma 3 on custom datasets using LoRA and QLoRA.

## Overview
Complete fine-tuning workflow for Gemma 3 using parameter-efficient LoRA.

## Instructions
- Prepare dataset in instruction-tuning format
- Select Gemma 3 variant (2B, 7B, or 27B)
- Configure LoRA: rank, alpha, target modules
- Apply 4-bit QLoRA for memory efficiency
- Train with gradient checkpointing enabled
- Evaluate on validation set with perplexity
- Merge LoRA adapters for deployment

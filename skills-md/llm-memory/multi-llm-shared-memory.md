---
title: "Multi-LLM Application with Shared Memory"
category: "llm-memory"
tags:
  - ai
  - memory
  - multi-llm
  - shared
  - collaboration
description: "Multiple LLMs sharing a common memory layer for collaborative problem-solving."
---

# Multi-LLM Application with Shared Memory

Multiple LLMs sharing a common memory layer for collaborative problem-solving.

## Overview
Enables multiple LLMs to share a common memory store for collaborative tasks.

## Instructions
- Initialize shared memory store accessible to all LLM instances
- Each LLM reads relevant memories before responding
- Write insights and facts to shared memory after each turn
- Implement memory conflict resolution for contradictions
- Route queries to most capable LLM per task type
- Maintain attribution: which LLM stored which memory

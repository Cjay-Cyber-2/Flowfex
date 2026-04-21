---
title: "Self-Improving Agent Skills"
category: "agent-skill"
tags:
  - ai
  - agent-skills
  - self-improvement
  - adk
  - gemini
description: "Automatically optimize agent skill prompts using AI evaluation and Gemini ADK."
---

# Self-Improving Agent Skills

Automatically optimize agent skill prompts using AI evaluation and Gemini ADK.

## Overview
Automatically evaluates and optimizes agent skill prompts using AI evaluation and Google ADK.

## Instructions
- Accept existing agent skill file as input
- Evaluate against test cases: task completion, accuracy, safety
- Score each dimension and identify weakest patterns
- Generate improved prompt variants
- A/B evaluate original vs improved prompts
- Promote highest-scoring variant to production

## Best Practices
Never auto-promote below 80% safety score.

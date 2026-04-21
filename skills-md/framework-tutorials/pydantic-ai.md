---
title: "Pydantic AI Agent Framework"
category: "framework-tutorial"
tags:
  - ai
  - pydantic
  - type-safe
  - agents
  - tutorial
description: "Build type-safe AI agents with structured outputs using Pydantic AI."
---

# Pydantic AI Agent Framework

Build type-safe AI agents with structured outputs using Pydantic AI.

## Overview
Guide to building reliable, type-safe AI agents using Pydantic AI.

## Core Concepts
- Agent: Typed agent with model and system prompt
- Result: Pydantic model defining structured output
- Tool: Typed function the agent can call
- RunContext: Shared context passed to all tools

## Instructions
- pip install pydantic-ai
- Define result schema as Pydantic BaseModel
- Create Agent with result_type and system_prompt
- Register tools using @agent.tool decorator
- Run with agent.run_sync() for synchronous tasks
- Access validated result via result.data

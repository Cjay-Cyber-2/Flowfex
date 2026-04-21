---
title: "AG2 AutoGen Adaptive Research Team"
category: "framework-tutorial"
tags:
  - ai
  - ag2
  - autogen
  - multi-agent
description: "Build adaptive multi-agent research systems using AG2."
---

# AG2 AutoGen Adaptive Research Team

Build adaptive multi-agent research systems using AG2.

## Overview
Guide to AG2 for conversational multi-agent research systems.

## Core Concepts
- ConversableAgent: Participates in multi-agent chat
- GroupChat: Multi-agent conversation orchestration
- AssistantAgent: LLM-backed task executor
- UserProxyAgent: Human-in-the-loop proxy

## Instructions
- pip install ag2
- Define specialist agents with system messages
- Create GroupChat with SelectSpeaker strategy
- Configure GroupChatManager as orchestrator
- Initiate with user_proxy.initiate_chat()

---
title: "Contextual AI RAG Agent"
category: "rag"
tags:
  - ai
  - rag
  - contextual
  - conversation
  - memory
description: "Context-aware RAG that tracks conversation state across turns."
---

# Contextual AI RAG Agent

Context-aware RAG that tracks conversation state across turns.

## Overview
Conversation-aware RAG that maintains context across multiple question turns.

## Instructions
- Track conversation history and entity references
- Resolve coreferences before embedding queries
- Merge new retrieval with known context from history
- Generate answers consistent with prior conversation
- Detect topic shifts and reset context appropriately

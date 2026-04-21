---
title: "Agentic RAG with Embedding Gemma"
category: "rag"
tags:
  - ai
  - rag
  - agentic
  - embedding
  - gemma
description: "Iterative agentic RAG that searches until the query is answered."
---

# Agentic RAG with Embedding Gemma

Iterative agentic RAG that searches until the query is answered.

## Overview
Agentic RAG that iteratively searches and retrieves until confident.

## Instructions
- Embed query using Gemma embedding model
- Search vector store for top-k chunks
- Evaluate chunk relevance and sufficiency
- If insufficient, reformulate and search again (max 3 iterations)
- Generate final grounded answer with citations

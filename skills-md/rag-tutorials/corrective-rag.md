---
title: "Corrective RAG (CRAG)"
category: "rag"
tags:
  - ai
  - rag
  - crag
  - self-correcting
description: "Self-correcting RAG with relevance grading and web search fallback."
---

# Corrective RAG (CRAG)

Self-correcting RAG with relevance grading and web search fallback.

## Overview
CRAG implementation with document grading and web search fallback.

## Instructions
- Retrieve initial documents from vector store
- Grade each document for relevance using LLM judge
- If below threshold, trigger web search fallback
- Combine corrected retrieval with relevant original docs
- Generate answer from validated context

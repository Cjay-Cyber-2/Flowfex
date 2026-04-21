---
title: "Local Hybrid Search RAG"
category: "rag"
tags:
  - ai
  - rag
  - local
  - hybrid-search
description: "Local hybrid search combining BM25 and vector search on-device."
---

# Local Hybrid Search RAG

Local hybrid search combining BM25 and vector search on-device.

## Overview
Fully local hybrid search RAG without cloud dependencies.

## Instructions
- Build both BM25 and FAISS index locally
- Run parallel search on both indexes
- Merge with RRF scoring algorithm
- Generate answers with local LLM
- Export ranked results with relevance explanations

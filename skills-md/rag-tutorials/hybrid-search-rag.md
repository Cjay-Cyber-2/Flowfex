---
title: "Hybrid Search RAG Cloud"
category: "rag"
tags:
  - ai
  - rag
  - hybrid-search
  - bm25
  - vector
description: "Combine dense and sparse search for superior cloud retrieval."
---

# Hybrid Search RAG Cloud

Combine dense and sparse search for superior cloud retrieval.

## Overview
Combines dense semantic search with BM25 keyword search.

## Instructions
- Maintain vector index and BM25 inverted index in parallel
- Run both searches on each query simultaneously
- Merge results using Reciprocal Rank Fusion (RRF)
- Re-rank with cross-encoder for final ordering
- Generate grounded answers from top-ranked hybrid results

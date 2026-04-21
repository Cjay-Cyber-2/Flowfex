---
title: "RAG Failure Diagnostics Clinic"
category: "rag"
tags:
  - ai
  - rag
  - diagnostics
  - debugging
  - optimization
description: "Systematically diagnose and fix RAG pipeline failures."
---

# RAG Failure Diagnostics Clinic

Systematically diagnose and fix RAG pipeline failures.

## Overview
Diagnostic framework for identifying and resolving RAG pipeline failures.

## Failure Categories
- Retrieval: wrong chunks, poor ranking
- Chunking: chunks too large or break semantic units
- Embedding: domain mismatch or poor model
- Generation: hallucination or ungrounded answers

## Instructions
- Run benchmark test set through pipeline
- Measure precision@k and recall@k
- Identify dominant failure mode
- Apply targeted fix and retest
- Report improvement delta per fix

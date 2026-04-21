---
title: "Basic RAG Chain"
category: "rag"
tags:
  - ai
  - rag
  - basic
  - starter
  - tutorial
description: "A minimal RAG chain for learning and prototyping."
---

# Basic RAG Chain

A minimal RAG chain for learning and prototyping.

## Overview
The simplest possible RAG chain — ideal for learning and rapid prototyping.

## Instructions
- Load a document source (text file, PDF, or URL)
- Chunk into fixed-size overlapping windows
- Embed with OpenAI or Sentence Transformers
- Store in FAISS in-memory index
- Ask a question, retrieve top-3 chunks, generate answer
- Print answer with retrieved context for transparency

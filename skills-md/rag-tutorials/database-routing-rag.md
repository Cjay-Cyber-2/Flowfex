---
title: "RAG with Database Routing"
category: "rag"
tags:
  - ai
  - rag
  - routing
  - database
  - multi-source
description: "Route queries to the correct database before retrieval based on query classification."
---

# RAG with Database Routing

Route queries to the correct database before retrieval based on query classification.

## Overview
Classifies queries and routes to the appropriate data source before retrieval.

## Instructions
- Classify incoming query by domain (HR, Finance, Engineering, etc.)
- Route to domain-specific knowledge base
- Retrieve from the most relevant database namespace
- Merge results from multiple domains if cross-domain query
- Generate answer clearly citing which database each fact came from

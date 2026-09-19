# NEXUS - Architecture

## Overview

NEXUS is a Mini SaaS collaboration application inspired by
Notion, Trello, and Slack.

The application consists of:

- React + Vite frontend
- Node.js + Express backend
- MongoDB for persistent data
- Redis for caching and queue infrastructure
- BullMQ for background jobs
- Socket.io for real-time communication

## High-Level Architecture

```text
                         Browser
                            |
                    React + Vite
                            |
                 REST API / Socket.io
                            |
                     Node + Express
                     /           \
                    /             \
               MongoDB           Redis
                                  |
                               BullMQ
                                  |
                               Workers
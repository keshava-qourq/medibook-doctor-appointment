<!-- sdlc:auto:start adr -->
# ADR-0004: Use AWS for Cloud

Status: Accepted  
Date: 2026-11-13

## Context and Problem Statement

Which Cloud technology does the project use? Decided in architecture v1.

## Considered Options

- AWS
- Azure
- Google Cloud
- DigitalOcean

## Decision Outcome

Chosen option: AWS, because The three safeguards the clinic committed to arrive as configuration: RDS encryption at rest with KMS, automated backups with point-in-time recovery, and TLS termination at the Application Load Balancer with an ACM certificate. ECS Fargate runs the API, the worker and the approved redis:7-alpine container without managing hosts, Secrets Manager holds DATABASE_URL and REDIS_URL, and a single-region deployment keeps identifiable health data resident where the clinic's regulations allow.

## Consequences

More moving parts than a single VPS for a one-clinic system, and the dev environment still costs an ALB and an RDS instance. The baseline safeguards here support NFR-011's posture but are not a HIPAA or GDPR certification, which is explicitly out of this build.
<!-- sdlc:auto:end adr -->
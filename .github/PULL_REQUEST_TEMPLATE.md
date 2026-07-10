# Pull Request

## Summary

Describe the change and why it belongs in the active product spine.

## Area

- [ ] Web API / runtime
- [ ] Agentic workbench
- [ ] Evidence ledger
- [ ] Policy gate
- [ ] Source registry / source admission
- [ ] Documentation
- [ ] CI / deployment
- [ ] Other

## Evidence And Policy

- [ ] Public claims are sourced or marked `[VERIFY REQUIRED]`.
- [ ] No private, leaked, credential, token, private-key, hacked, or controlled material is introduced.
- [ ] Any new source includes owner, URL, license/terms, update mode, and limitations.
- [ ] Any new model or agent path remains policy-gated and evidence-logged.

## Verification

- [ ] `npm.cmd --prefix web run type-check:full`
- [ ] `npm.cmd --prefix web test`
- [ ] `npm.cmd --prefix web run build`
- [ ] Documentation updated where needed

## Notes For Reviewers

Call out risks, migration steps, or areas where review should be especially strict.

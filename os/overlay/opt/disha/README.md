This directory is the install root for DISHA OS.

During image build, the repository root should be copied here so systemd units can run:
- `/opt/disha/disha/brain` (Brain service)
- `/opt/disha/web` (Web service)

The live-build pipeline copies `os/overlay/` into the image. In a production build,
we additionally copy the repo code into `/opt/disha` as part of the build step.


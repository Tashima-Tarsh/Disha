import torch
import numpy as np
from typing import Dict, List, Tuple, Any
import structlog

logger = structlog.get_logger(__name__)


class MDEngine:
    def __init__(self, device: str = "cpu"):
        self.device = torch.device(device)
        self.logger = logger.bind(component="md_engine")

    def lennard_jones_force(
        self,
        pos: torch.Tensor,
        box_size: float,
        epsilon: float = 1.0,
        sigma: float = 1.0,
        cutoff: float = 3.0,
        external_stress: torch.Tensor = None,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        n_atoms = pos.shape[0]

        diff = pos.unsqueeze(1) - pos.unsqueeze(0)

        diff = diff - box_size * torch.round(diff / box_size)

        r2 = torch.sum(diff**2, dim=-1)

        mask = ~torch.eye(n_atoms, dtype=torch.bool, device=self.device)
        r2_masked = r2[mask].view(n_atoms, n_atoms - 1)
        diff_masked = diff[mask].view(n_atoms, n_atoms - 1, 3)

        cutoff2 = cutoff**2
        within_cutoff = r2_masked < cutoff2

        r2_clamp = torch.clamp(r2_masked, min=0.6**2)

        inv_r2 = 1.0 / r2_clamp
        inv_r6 = inv_r2**3
        inv_r12 = inv_r6**2

        pe_terms = 4.0 * epsilon * (inv_r12 - inv_r6)
        pe_total = torch.sum(pe_terms[within_cutoff]) / 2.0

        f_mag = 24.0 * epsilon * (2.0 * inv_r12 - inv_r6) * inv_r2
        f_mag[~within_cutoff] = 0.0

        internal_forces = torch.sum(f_mag.unsqueeze(-1) * diff_masked, dim=1)

        if external_stress is not None:
            total_forces = internal_forces + external_stress.unsqueeze(0)
        else:
            total_forces = internal_forces

        return total_forces, pe_total

    async def simulate(
        self,
        n_atoms: int = 64,
        timesteps: int = 100,
        dt: float = 0.005,
        target_temp: float = 1.0,
        langevin_gamma: float = 0.1,
        material_params: Dict[str, Any] = None,
        external_stress: List[float] | None = None,
    ) -> Dict[str, Any]:
        params = material_params or {"epsilon": 1.0, "sigma": 1.0, "mass": 1.0}
        epsilon = params.get("epsilon", 1.0)
        sigma = params.get("sigma", 1.0)
        mass = params.get("mass", 1.0)

        stress_tensor = None
        if external_stress:
            stress_tensor = torch.tensor(
                external_stress, device=self.device, dtype=torch.float32
            )

        n_side = int(np.ceil(n_atoms ** (1 / 3.0)))
        lattice_spacing = 1.2 * sigma
        box_size = n_side * lattice_spacing
        pos_list = []
        for i in range(n_side):
            for j in range(n_side):
                for k in range(n_side):
                    if len(pos_list) < n_atoms:
                        pos_list.append(
                            [
                                i * lattice_spacing,
                                j * lattice_spacing,
                                k * lattice_spacing,
                            ]
                        )
        pos = torch.tensor(pos_list, device=self.device, dtype=torch.float32)

        vel = torch.randn((n_atoms, 3), device=self.device) * np.sqrt(
            target_temp / mass
        )

        forces, pe = self.lennard_jones_force(
            pos, box_size, epsilon, sigma, external_stress=stress_tensor
        )
        accel = forces / mass
        energies = []

        for step in range(timesteps):
            vel += 0.5 * accel * dt

            pos += vel * dt

            pos = pos % box_size

            forces, pe = self.lennard_jones_force(
                pos, box_size, epsilon, sigma, external_stress=stress_tensor
            )
            accel = forces / mass

            friction_force = -langevin_gamma * vel
            random_force = torch.randn_like(vel) * np.sqrt(
                2.0 * langevin_gamma * target_temp / dt
            )
            accel += (friction_force + random_force) / mass

            vel += 0.5 * accel * dt

            ke = 0.5 * mass * torch.sum(vel**2)
            temp = (2.0 * ke) / (3.0 * n_atoms)
            if step % 10 == 0:
                energies.append(
                    {
                        "step": step,
                        "pe": float(pe),
                        "ke": float(ke),
                        "total_energy": float(pe + ke),
                        "temp": float(temp),
                    }
                )
        return {
            "status": "success",
            "n_atoms": n_atoms,
            "box_size": box_size,
            "final_temp": float(temp),
            "diagnostics": energies,
            "final_positions": pos.tolist(),
        }

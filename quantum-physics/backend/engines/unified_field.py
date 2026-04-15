"""
Unified Field Engine — fundamental forces and their unification history.
"""
from __future__ import annotations

import math


class UnifiedFieldEngine:
    """Models the four fundamental forces and their unification at energy scales."""

    # Running coupling constants (approximate, at relevant scales)
    _ALPHA_EM = 1 / 137.036  # at low energy
    _ALPHA_W = 0.0338        # weak at M_Z
    _ALPHA_S = 0.1179        # strong at M_Z
    _G_N = 6.674e-11         # Newton's constant (SI)
    _M_PLANCK = 1.221e19     # GeV

    def get_fundamental_forces(self) -> list[dict]:
        return [
            {
                "id": "strong",
                "name": "Strong Nuclear Force",
                "symbol": "F_s",
                "mediator": "Gluons (8 types)",
                "range_m": 1e-15,
                "relative_strength": 1.0,
                "coupling_constant": {"alpha_s": self._ALPHA_S, "note": "at M_Z ~ 91 GeV"},
                "acts_on": ["quarks", "gluons", "hadrons"],
                "gauge_group": "SU(3)_c",
                "color": "#ff2d78",
                "description": "Binds quarks into protons and neutrons; residual force holds nuclei together.",
                "unification_partner": "electroweak at ~10¹⁵ GeV (GUT scale)",
                "energy_scale_gev": {"relevant": 0.2, "unifies_above": 1e15},
            },
            {
                "id": "electromagnetic",
                "name": "Electromagnetic Force",
                "symbol": "F_em",
                "mediator": "Photon (γ)",
                "range_m": float("inf"),
                "relative_strength": 1 / 137,
                "coupling_constant": {"alpha": self._ALPHA_EM, "note": "fine structure constant"},
                "acts_on": ["charged particles", "photons"],
                "gauge_group": "U(1)_em",
                "color": "#00e5ff",
                "description": "Governs electricity, magnetism, and light. Unified with weak force at ~100 GeV.",
                "unification_partner": "weak force (electroweak) at ~100 GeV",
                "energy_scale_gev": {"relevant": 0.001, "unifies_above": 100},
            },
            {
                "id": "weak",
                "name": "Weak Nuclear Force",
                "symbol": "F_w",
                "mediator": "W±, Z⁰ bosons",
                "range_m": 1e-18,
                "relative_strength": 1e-6,
                "coupling_constant": {"alpha_w": self._ALPHA_W, "note": "at M_W ~ 80 GeV"},
                "acts_on": ["quarks", "leptons", "neutrinos"],
                "gauge_group": "SU(2)_L",
                "color": "#bf5af2",
                "description": "Responsible for radioactive beta decay and neutrino interactions.",
                "unification_partner": "electromagnetic (electroweak) at ~100 GeV",
                "energy_scale_gev": {"relevant": 0.001, "unifies_above": 100},
            },
            {
                "id": "gravity",
                "name": "Gravitational Force",
                "symbol": "F_g",
                "mediator": "Graviton (hypothetical, spin-2)",
                "range_m": float("inf"),
                "relative_strength": 6e-39,
                "coupling_constant": {"G_N": self._G_N, "note": "Newton's constant"},
                "acts_on": ["all mass-energy"],
                "gauge_group": "Diffeomorphism invariance (GR)",
                "color": "#ffd60a",
                "description": "Weakest force but infinite range; dominates at macroscopic/cosmological scales.",
                "unification_partner": "others at Planck scale ~10¹⁹ GeV",
                "energy_scale_gev": {"relevant": 0.001, "unifies_above": self._M_PLANCK},
            },
        ]

    def get_unification_history(self) -> list[dict]:
        return [
            {
                "year": 1873,
                "name": "Electromagnetic Unification",
                "forces_unified": ["electricity", "magnetism"],
                "result": "Classical Electromagnetism (Maxwell)",
                "key_figure": "James Clerk Maxwell",
                "energy_scale": "classical",
                "description": "Maxwell's equations showed electricity and magnetism are manifestations of a single force.",
            },
            {
                "year": 1968,
                "name": "Electroweak Unification",
                "forces_unified": ["electromagnetic", "weak"],
                "result": "Electroweak Theory (GSW Model)",
                "key_figures": ["Glashow", "Salam", "Weinberg"],
                "energy_scale_gev": 100,
                "description": "At energies above ~100 GeV, electromagnetic and weak forces merge into a single electroweak force.",
                "experimental_confirmation": "W and Z bosons discovered at CERN in 1983",
            },
            {
                "year": 1974,
                "name": "Grand Unified Theory (GUT) proposals",
                "forces_unified": ["electroweak", "strong"],
                "result": "GUT (not yet confirmed)",
                "key_figures": ["Georgi", "Glashow", "Pati", "Salam"],
                "energy_scale_gev": 1e15,
                "description": "At ~10¹⁵ GeV, all three Standard Model forces may unify. Predicts proton decay (not yet observed).",
                "experimental_confirmation": None,
            },
            {
                "year": 1984,
                "name": "Theory of Everything (ToE) candidates",
                "forces_unified": ["electroweak", "strong", "gravity"],
                "result": "String Theory, Loop Quantum Gravity (unconfirmed)",
                "key_figures": ["Schwarz", "Green", "Witten", "Rovelli"],
                "energy_scale_gev": 1.221e19,
                "description": "At the Planck scale, quantum gravity effects become significant. String theory and LQG are leading candidates.",
                "experimental_confirmation": None,
            },
        ]

    def model_unification(self, energy_scale_gev: float) -> dict:
        """Predict which forces are unified at the given energy scale."""
        forces = self.get_fundamental_forces()
        active_unifications: list[str] = []
        unified_groups: list[dict] = []

        # Running coupling constant approximations (1-loop RGE)
        log_e = math.log10(max(energy_scale_gev, 0.001))

        alpha_em_run = self._ALPHA_EM * (1 + self._ALPHA_EM / (3 * math.pi) * log_e * 3)
        alpha_s_run = self._ALPHA_S / (1 + (7 * self._ALPHA_S) / (2 * math.pi) * log_e)

        if energy_scale_gev >= 100:
            active_unifications.append("electroweak")
            unified_groups.append({
                "name": "Electroweak",
                "forces": ["electromagnetic", "weak"],
                "gauge_group": "SU(2)_L × U(1)_Y",
                "confirmed": True,
            })

        if energy_scale_gev >= 1e15:
            active_unifications.append("gut")
            unified_groups.append({
                "name": "Grand Unified (GUT)",
                "forces": ["electromagnetic", "weak", "strong"],
                "gauge_group": "SU(5) or SO(10)",
                "confirmed": False,
            })

        if energy_scale_gev >= self._M_PLANCK * 0.1:
            active_unifications.append("toe")
            unified_groups.append({
                "name": "Theory of Everything",
                "forces": ["electromagnetic", "weak", "strong", "gravity"],
                "gauge_group": "Unknown (String / LQG)",
                "confirmed": False,
            })

        separated_forces = [f["name"] for f in forces]
        if "electroweak" in active_unifications:
            separated_forces = [f for f in separated_forces if f not in ("Electromagnetic Force", "Weak Nuclear Force")]
            separated_forces.append("Electroweak Force")

        return {
            "energy_scale_gev": energy_scale_gev,
            "energy_scale_label": self._energy_label(energy_scale_gev),
            "active_unifications": active_unifications,
            "unified_groups": unified_groups,
            "separated_forces": separated_forces,
            "running_couplings": {
                "alpha_em": round(alpha_em_run, 6),
                "alpha_s": round(alpha_s_run, 6),
                "alpha_w": round(self._ALPHA_W, 6),
            },
            "num_independent_forces": max(4 - len(active_unifications), 1),
        }

    def _energy_label(self, gev: float) -> str:
        if gev < 1:
            return f"{gev * 1000:.0f} MeV (atomic scale)"
        elif gev < 100:
            return f"{gev:.1f} GeV (hadronic scale)"
        elif gev < 1e6:
            return f"{gev:.0f} GeV (electroweak scale)"
        elif gev < 1e15:
            return f"10^{math.log10(gev):.0f} GeV (intermediate scale)"
        elif gev < 1e18:
            return f"10^{math.log10(gev):.0f} GeV (GUT scale)"
        else:
            return f"~10^{math.log10(gev):.0f} GeV (Planck scale)"

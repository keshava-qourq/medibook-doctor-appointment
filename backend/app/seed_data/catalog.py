"""The starter disease/symptom catalogue (US-009-1).

One reviewable data module: plain literal tuples, inserted deterministically by
``app.seed.seed_catalog``. No AI, LLM or ML is involved anywhere (NFR-012).

``SEED_SPECIALIZATIONS`` is ``(name, description)``.
``SEED_TERMS`` is ``(term, entry_type, specialization names)`` where
``entry_type`` is ``"disease"`` or ``"symptom"``; every named specialization
appears in ``SEED_SPECIALIZATIONS``.
"""

SEED_SPECIALIZATIONS: tuple[tuple[str, str], ...] = (
    ("General Medicine", "First-line care for common illness and undiagnosed complaints."),
    ("Cardiology", "Heart and circulatory conditions."),
    ("Dermatology", "Skin, hair and nail conditions."),
    ("Neurology", "Brain, spinal cord and nerve conditions."),
    ("Orthopaedics", "Bones, joints, ligaments and muscles."),
    ("Pulmonology", "Lungs and the respiratory tract."),
    ("Gastroenterology", "Digestive system and liver."),
    ("Endocrinology", "Hormones, diabetes and metabolism."),
    ("Ophthalmology", "Eyes and vision."),
    ("ENT", "Ear, nose and throat conditions."),
)

SEED_TERMS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("Influenza", "disease", ("General Medicine", "Pulmonology")),
    ("Hypertension", "disease", ("Cardiology", "General Medicine")),
    ("Diabetes", "disease", ("Endocrinology", "General Medicine")),
    ("Asthma", "disease", ("Pulmonology",)),
    ("Eczema", "disease", ("Dermatology",)),
    ("Migraine", "disease", ("Neurology",)),
    ("Arthritis", "disease", ("Orthopaedics",)),
    ("Gastritis", "disease", ("Gastroenterology",)),
    ("Conjunctivitis", "disease", ("Ophthalmology",)),
    ("Sinusitis", "disease", ("ENT", "General Medicine")),
    ("Chest pain", "symptom", ("Cardiology", "General Medicine")),
    ("Shortness of breath", "symptom", ("Pulmonology", "Cardiology")),
    ("Headache", "symptom", ("Neurology", "General Medicine")),
    ("Fever", "symptom", ("General Medicine",)),
    ("Skin rash", "symptom", ("Dermatology",)),
    ("Joint pain", "symptom", ("Orthopaedics",)),
    ("Abdominal pain", "symptom", ("Gastroenterology", "General Medicine")),
    ("Blurred vision", "symptom", ("Ophthalmology",)),
    ("Sore throat", "symptom", ("ENT", "General Medicine")),
    ("Dizziness", "symptom", ("Neurology", "General Medicine")),
)

__all__ = ["SEED_SPECIALIZATIONS", "SEED_TERMS"]

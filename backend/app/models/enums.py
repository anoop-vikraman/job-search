import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class TweakStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    closed = "closed"


class TweakType(str, enum.Enum):
    remote = "remote"
    in_person = "in_person"


class PricingModel(str, enum.Enum):
    hourly = "hourly"
    quantity = "quantity"
    fixed = "fixed"
    quote = "quote"


class ApplicationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    completed = "completed"
    rejected = "rejected"
    withdrawn = "withdrawn"
    # Escrow frozen while an admin reviews a dispute.
    disputed = "disputed"


class DisputeStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"


class DisputeOutcome(str, enum.Enum):
    release = "release"  # provider gets paid in full
    refund = "refund"  # lister gets the escrow back
    partial = "partial"  # provider gets part, lister the rest


class NotificationType(str, enum.Enum):
    application_received = "application_received"
    application_accepted = "application_accepted"
    application_rejected = "application_rejected"
    counter_offer = "counter_offer"
    tweak_completed = "tweak_completed"
    refund_processed = "refund_processed"
    wallet_topup = "wallet_topup"
    system = "system"
    new_message = "new_message"
    work_submitted = "work_submitted"
    dispute_opened = "dispute_opened"
    dispute_resolved = "dispute_resolved"


class TxnType(str, enum.Enum):
    topup = "topup"
    hold = "hold"
    release = "release"
    refund = "refund"
    payout = "payout"
    fee = "fee"


class TxnStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    reversed = "reversed"


class KycStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class KycIdType(str, enum.Enum):
    aadhaar = "aadhaar"
    pan = "pan"
    passport = "passport"
    driving_licence = "driving_licence"
    voter_id = "voter_id"


class ReportTarget(str, enum.Enum):
    user = "user"
    tweak = "tweak"
    message = "message"


class ReportReason(str, enum.Enum):
    spam = "spam"
    scam = "scam"
    harassment = "harassment"
    inappropriate = "inappropriate"
    no_show = "no_show"
    other = "other"


class ReportStatus(str, enum.Enum):
    open = "open"
    actioned = "actioned"
    dismissed = "dismissed"


class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    done = "done"
    failed = "failed"


class PaymentStatus(str, enum.Enum):
    created = "created"
    paid = "paid"
    failed = "failed"


class PayoutStatus(str, enum.Enum):
    requested = "requested"
    paid = "paid"
    rejected = "rejected"


class RefundStatus(str, enum.Enum):
    requested = "requested"
    approved = "approved"
    rejected = "rejected"
    processed = "processed"

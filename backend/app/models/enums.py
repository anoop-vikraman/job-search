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


class RefundStatus(str, enum.Enum):
    requested = "requested"
    approved = "approved"
    rejected = "rejected"
    processed = "processed"

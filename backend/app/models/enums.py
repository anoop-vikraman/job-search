import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class TweakStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
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
    rejected = "rejected"
    withdrawn = "withdrawn"


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

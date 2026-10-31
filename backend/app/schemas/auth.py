from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints

Phone = Annotated[str, StringConstraints(pattern=r"^[0-9]{7,15}$")]
CountryCode = Annotated[str, StringConstraints(pattern=r"^\+[0-9]{1,4}$")]
Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]
OtpCode = Annotated[str, StringConstraints(pattern=r"^[0-9]{6}$")]


class LoginRequest(BaseModel):
    country_code: CountryCode
    phone_number: Phone
    password: str


class SignupRequest(BaseModel):
    country_code: CountryCode
    phone_number: Phone
    password: Password
    first_name: Annotated[str, StringConstraints(min_length=1, max_length=80)]
    last_name: str | None = None
    email: str | None = None
    date_of_birth: str | None = None
    referral_code: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class GenerateOtpRequest(BaseModel):
    country_code: CountryCode
    phone_number: Phone
    request_type: Literal["SIGNUP", "FORGOT_PASSWORD"]


class VerifyOtpRequest(BaseModel):
    country_code: CountryCode
    phone_number: Phone
    otp: OtpCode
    request_type: Literal["SIGNUP", "FORGOT_PASSWORD"]


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

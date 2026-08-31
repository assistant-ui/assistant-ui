import random
import string


def generate_prefixed_id(prefix: str, length: int = 24) -> str:
    characters = string.ascii_letters + string.digits
    return prefix + "".join(random.choices(characters, k=length))

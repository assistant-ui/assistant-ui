from assistant_stream.gorp import GorpProxy


class StateProxy(GorpProxy):
    """Proxy object for state access and updates using dictionary-style access.

    Example:
        state_proxy["user"]["name"] = "John"
        name = state_proxy["user"]["name"]
        state_proxy["messages"] += "Hello"
        state_proxy["items"].append("item")
    """

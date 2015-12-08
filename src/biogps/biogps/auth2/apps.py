from django.apps import AppConfig


class Auth2Config(AppConfig):
    name = 'biogps.auth2'

    def ready(self):
        from biogps.auth2 import signals

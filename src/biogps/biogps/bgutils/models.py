from django.db import models
from django.conf import settings


class Language(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL)
    language = models.CharField(max_length=10, choices=settings.LANGUAGES)

from __future__ import unicode_literals

from django.db import models

class User(models.Model):
	username = models.CharField(max_length=50)
	emailid = models.EmailField()
	password = models.CharField(max_length=50)
	confirm_password = models.CharField(max_length=50)

	def __str__(self):
		return self.username

# Create your models here.

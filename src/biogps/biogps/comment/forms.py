from threadedcomments.forms import ThreadedCommentForm

from django import forms
from django.utils.translation import ungettext, ugettext, ugettext_lazy as _


class BiogpsThreadedCommentForm(ThreadedCommentForm):
    name = forms.CharField(label=_("Name"), max_length=50, required=False)
    email = forms.EmailField(label=_("Email address"), required=False)

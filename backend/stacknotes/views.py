from http.client import HTTPResponse
from django.shortcuts import render
from django.http import HttpResponse
# Create your views here.
def home(request):
    print(request.POST)
    print(request.GET)
    return HttpResponse(request.POST)
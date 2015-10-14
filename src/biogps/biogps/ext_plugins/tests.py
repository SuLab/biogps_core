from django.test import Client
from django.utils import simplejson

c=Client()

## GeneViewer is decpreated
#def testgrGeneViewer():
#    res = c.get('/ext/geneviewer/', dict(geneid=1017))
#    assert res.status_code == 200
#    assert res.content.find('new SWFObject("/assets/swf/GeneViewer.swf"') != -1

def testgrDescription():
    res = c.get('/ext/description/', dict(geneid=1017))
    assert res.status_code == 200
    assert res.content.find('The protein encoded by this gene is a member of the Ser/Thr protein kinase family.') != -1

def testgrFunction():
    res = c.get('/ext/function/', dict(geneid=1017))
    assert res.status_code == 200
    assert res.content.find('GO:0005524 - ATP binding') != -1

def testgrSymatlasTable():
    res = c.get('/ext/symatlasbar/', dict(geneid=1017))
    assert res.status_code == 200
    assert res.content.find('cyclin-dependent kinase 2') != -1
    assert res.content.find('cyclin-dependent kinase 2') != -1
    assert res.content.find('IPR000719') != -1
    assert res.content.find('NM_001798') != -1
    assert res.content.find('NP_001789') != -1
    assert res.content.find('1833_at') != -1

    #test missing geneid
    res = c.get('/ext/symatlasbar/')
    assert res.status_code == 400



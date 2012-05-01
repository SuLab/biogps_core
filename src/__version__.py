"""Tag: 1304461343"""
major = 2
minor = 0
micro = 4
revision = '$Rev: 9037 $'
date = '$Date: 2011-05-03 15:23:21 -0700 (Tue, 03 May 2011) $'
id = '$Id: __version__.py 9037 2011-05-03 22:23:21Z cwu@LJ.GNF.ORG $'
headurl = '$HeadURL: https://svn.gnf.org/compdisc/BioGPS/trunk/src/__version__.py $.'

version = '%s.%s.%s.%s' % (major, minor, micro, revision[5:-1].strip())

if __name__ == '__main__':
    #update itself
    import os,re,time
    infile = '__version__.py'
    tmpfile = infile+'__tmp__'
    in_f = file(infile)
    out_f = file(tmpfile,'w')
    out_f.write(re.sub('^"""Tag:.*"""', '"""Tag: %d"""' % time.time(), in_f.read()))
    out_f.close()
    in_f.close()
    os.remove(infile)
    os.rename(tmpfile, infile)

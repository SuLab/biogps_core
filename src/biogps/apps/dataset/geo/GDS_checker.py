###############################################################
#  Check GDS files for referenced GSE datasets.               #
#  If we've already processed a GDS file pertaining to a GSE  #
#  dataset we do not need to upload the GSE file as well.     #
###############################################################

from os import path
import glob


def check_GSE_files():
    gds_files = glob.glob('/archive/CompDisc/imacleod/GEO/GDS*.soft')
    test_platforms = list(('GPL8300', 'GPL570', 'GPL96', 'GPL571', 'GPL97',
                           'GPL339', 'GPL340', 'GPL9523', 'GPL1261', 'GPL8321',
                           'GPL5766', 'GPL5759', 'GPL8492'))
    already_uploaded = list()

    for gds_file in gds_files:
        filename = path.splitext(path.basename(gds_file))[0]
        print ''
        print filename
        with open(gds_file) as s_file:
            in_platforms = False
            for line in s_file:
                if line.startswith('!dataset_platform '):
                    platform = line.rstrip('\n').split('=')[1].lstrip()
                    if platform in test_platforms:
                        in_platforms = True
                    else:
                        # Platform we're not interested in - go to next file
                        break
                if line.startswith('!dataset_reference_series ') \
                and in_platforms:
                    ref_dataset = line.rstrip('\n').split('=')[1].lstrip()
                    print 'Found reference dataset: %s!' % ref_dataset
                    already_uploaded.append(ref_dataset)

    print ''
    print 'Total found: %s' % len(already_uploaded)

    print ''
    already_uploaded = set(already_uploaded)
    print 'Total uniques found: %s' % len(already_uploaded)

    print ''
    print 'Already uploaded:'
    print already_uploaded

    # Write to file for use with GSE file parser
    results = open('/archive/CompDisc/imacleod/GEO/csv/skipped_GSE.csv', 'w')
    results.write(','.join([i for i in already_uploaded]))
    results.close()

if __name__ == "__main__":
    check_GSE_files()

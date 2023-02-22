# -*- coding: utf-8 -*-
#
# "TheVirtualBrain - Widgets" package
#
# (c) 2022-2023, TVB Widgets Team
#

class TVBExtBucketException(Exception):

    def __init__(self, message):
        super().__init__(message)
        self.message = str(message)

    def __str__(self):
        return self.message


class CollabTokenError(TVBExtBucketException):
    """
    Exception to be thrown when collab token is not available
    """


class CollabAccessError(TVBExtBucketException):
    """
    Exception to be thrown when connection to a bucket is not possible
    """


class BucketDTOError(TVBExtBucketException):
    """
    Exception on bucket DTOs
    """


class DataproxyFileNotFound(TVBExtBucketException):
    """
    Exception to be thrown when a DataproxyFile can't be found in a bucket
    """

from django.conf import settings
from django.core.files.storage import FileSystemStorage, Storage
from django.utils.deconstruct import deconstructible
from django.utils.functional import cached_property


@deconstructible
class RawAssetStorage(Storage):
    @cached_property
    def storage(self):
        if getattr(settings, "CLOUDINARY_CONFIGURED", False):
            from cloudinary_storage.storage import RawMediaCloudinaryStorage

            return RawMediaCloudinaryStorage()
        return FileSystemStorage(location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL)

    def _open(self, name, mode="rb"):
        return self.storage.open(name, mode)

    def _save(self, name, content):
        return self.storage.save(name, content)

    def delete(self, name):
        return self.storage.delete(name)

    def exists(self, name):
        return self.storage.exists(name)

    def size(self, name):
        return self.storage.size(name)

    def url(self, name):
        return self.storage.url(name)

    def path(self, name):
        if hasattr(self.storage, "path"):
            return self.storage.path(name)
        raise NotImplementedError("This storage backend does not support local filesystem paths.")

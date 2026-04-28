import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  Typography,
} from "@mui/material";
import { ZoomIn, ZoomOut } from "@mui/icons-material";
import { getCroppedImg } from "@/utils/cropImage";

interface ImageCropDialogProps {
  open: boolean;
  image: string; // Base64 or URL of the image to crop
  onClose: () => void;
  onCropComplete: (croppedImage: string) => void;
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  open,
  image,
  onClose,
  onCropComplete,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropAreaComplete = useCallback(
    (_croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setLoading(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          className: "rounded-3xl overflow-hidden",
          sx: { bgcolor: "background.paper" },
        },
      }}
    >
      <DialogTitle className="pb-2">
        <Typography variant="h6" className="font-black">Crop Profile Photo</Typography>
        <Typography variant="caption" className="text-muted-foreground block">
          Adjust your photo to fit the circle perfectly
        </Typography>
      </DialogTitle>

      <DialogContent className="p-0">
        <div className="relative h-64 w-full bg-muted">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaComplete}
          />
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center gap-4">
            <ZoomOut fontSize="small" className="text-muted-foreground" />
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(_e, newValue) => onZoomChange(newValue as number)}
              className="flex-1"
              sx={{ color: 'primary.main' }}
            />
            <ZoomIn fontSize="small" className="text-muted-foreground" />
          </div>
        </div>
      </DialogContent>

      <DialogActions className="p-4 gap-2">
        <Button onClick={onClose} disabled={loading} color="inherit" className="normal-case">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || !croppedAreaPixels}
          className="rounded-xl normal-case font-bold"
        >
          {loading ? "Cropping..." : "Save Photo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageCropDialog;

import ImageViewer from './controllers/ImageViewer'
import RegionSelector from './controllers/RegionSelector'
import { rectifyImage } from './lib/rectify'
import { $ } from './lib/util'

/**
 * Initialization
 */

document.addEventListener('DOMContentLoaded', () => {
  const filePicker = $('#file-picker')
  let fileInfo = null

  const inputImage = new ImageViewer($('canvas#input-image'))
  const regionSelector = new RegionSelector($('canvas#region-selector'))
  const applyButton = $('#apply-button')

  const outputImage = new ImageViewer($('canvas#output-image'))
  const saveButton = $('#save-button')

  // Loading the input image

  filePicker.addEventListener('change', event => {
    const imageFile = event.target.files[0]
    loadInputImage(imageFile)
  })

  document.body.addEventListener('dragover', event => {
    event.preventDefault()
  })

  document.body.addEventListener('drop', event => {
    event.preventDefault()
    const imageFile = Array.prototype.find.call(
      event.dataTransfer.files,
      isImageFile
    )
    loadInputImage(imageFile)
  })

  //Load the image and resize it to the canvas size.
  async function loadInputImage(imageFile) {
    if (!isImageFile(imageFile)) {
      return alert('⚠️ Please upload an image.')
    }
    fileInfo = { name: imageFile.name, type: imageFile.type }

    inputImage.clear()
    outputImage.clear()
    applyButton.hidden = true
    saveButton.hidden = true
    saveButton.href = ''

    await inputImage.loadFile(imageFile)
    regionSelector.resize(inputImage.canvas.width, inputImage.canvas.height)
    applyButton.hidden = false
  }

  //Rectification
  applyButton.addEventListener('click', async () => {
    saveButton.hidden = true
    outputImage.clear()

    //Get the rectified Image data.
    const rectifiedImageData = await rectifyImage( inputImage.getImageData(), 
                                                  regionSelector.corners,
                                                  { onProgress: progress => outputImage.renderProgress(progress) }
                                                  )

    //Display the rectified image data. loadImageData is inbuilt, which takes in imageData and renders it.
    outputImage.loadImageData(rectifiedImageData)
    saveButton.hidden = false
  })

  //Save button

  saveButton.addEventListener('click', () => {
    saveButton.href = outputImage.canvas.toDataURL(fileInfo.type)
    saveButton.download = addSuffix(fileInfo.name, 'rectified')
  })
})

//Utility functions

function isImageFile(file) {
  return file && /^image\//.test(file.type)
}

function addSuffix(fileName, suffix) {
  const parts = fileName.split('.')
  if (parts.length > 1) {
    const name = parts.slice(0, -1).join('.')
    const extension = parts[parts.length - 1]
    return `${name}-${suffix}.${extension}`
  } else {
    return `${fileName}-${suffix}`
  }
}

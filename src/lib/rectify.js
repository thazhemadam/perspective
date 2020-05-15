import { distance, gaussJordan, transform } from './math'
import { getInterpolatedPixel, setPixel } from './pixels'
import { nextTick } from './util'

//Rectification

//Size of A4 sheet
const A4 = 210 / 297

//The image in the input canvas region, the specified corners, and the ratio to tune it down into, along with the output render progress. 
export function rectifyImage(imageData,corners,{ ratio = A4, onProgress } = {}){
  
  const maxWidth = Math.max(
    distance(corners[0], corners[1]),
    distance(corners[2], corners[3])
  )
  
  //Width of the output image to be rendered must have the maximum width between two corners of the input image.
  const width = Math.round(maxWidth)          
  //Height of the output image to be rendered must be the (standard A4 ratio*the factor by which width is a multiple of the A4 ratio)
  const height = Math.round(maxWidth / ratio)
  //Homography Matrix will be calculated using the corners provided, to be rendered into a frame that has the newly calcuated height and width
  const HomographyMatrix = findHomography(corners, width, height)
  //Finally, the Homography will be applied, and returned into rectifiedImageData. 
  //Note: applyHomography returns an object of type ImageData, to be rendered onto the canvas. 
  return applyHomography(imageData, HomographyMatrix, width, height, onProgress)
}

function findHomography(toCorners, width, height) {

  //Finding Homography Matrix, H. This will produce a system 8 linear equations.
  const fromCorners = [[0, 0], [width, 0], [width, height], [0, height]]
  const system = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = fromCorners[i]
    const [u, v] = toCorners[i]
    system.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
    system.push([0, 0, 0, x, y, 1, -v * x, -v * y, v])
  }

  const solution = gaussJordan(system)
  //solution contains the solution for each of the 8 unknowns in the homography matrix. 
  return [
    [solution[0], solution[1], solution[2]],
    [solution[3], solution[4], solution[5]],
    [solution[6], solution[7],         1.0],
  ]
}

async function applyHomography(imageData, H, width, height, onProgress) {
  const result = new ImageData(width, height)

  for (let y = 0; y < height; y++) {
    if (y % 10 === 0) {
      if (onProgress) onProgress(y / height)
      await nextTick()
    }

    for (let x = 0; x < width; x++) {
      const [wu, wv, w] = transform(H, [x, y, 1.0])
      //Performs bilinear pixel interpolation to every single pixel in the 4 corners of the input image with respect to the transformation required.
      //sets all the the data of the imageData (i.e, "result"), with respect to the bilinear pixel interpolation performed on the four corners. 
      setPixel(result, x, y, getInterpolatedPixel(imageData, wu / w, wv / w))
    }
  }

  return result
}

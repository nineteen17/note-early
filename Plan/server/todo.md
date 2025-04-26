# TODO: Implement Pre-selected Image Picker from Cloud Storage

This document outlines the steps needed to implement a feature allowing users to select profile avatars and reading module images from a predefined set hosted in a cloud storage bucket (e.g., AWS S3 or Cloudflare R2).

## Tasks

1.  **Set up Cloud Storage Bucket (S3/R2):**

    - Create a new bucket.
    - Configure public read access (or use signed URLs) for the images.
    - _Optional:_ Set up backend credentials if needed for management, but not required for fetching the list if using the DB approach.

2.  **Prepare and Upload Images:**

    - Curate a set of appropriate avatar images.
    - Curate a set of appropriate reading module cover images.
    - Upload these images to the designated S3/R2 bucket, organizing them potentially into folders (e.g., `/avatars`, `/module-covers`).

3.  **Backend API Implementation:**

    - **Store Image List in DB (Recommended):**
      - Create a simple table (e.g., `asset_images`) to store the URLs and types (`avatar`, `module`) of the pre-selected images available in the bucket.
      - Populate this table with the URLs of the uploaded images.
      - Create a new API endpoint, e.g., `GET /api/v1/assets/images`.
      - This endpoint should accept an optional query parameter `?type=avatar` or `?type=module`.
      - The controller/service fetches the list of image URLs from the `asset_images` table based on the type.
      - The endpoint returns a JSON array of image URLs.
    - **Update Profile/Module Endpoints:**
      - Ensure the existing endpoints for creating/updating profiles (`PUT /users/{userId}`, `PATCH /users/students/{studentId}`) and modules (`POST /reading-modules`, `PATCH /reading-modules/{id}`) accept the selected image URL (string) in the request body and save it to the `avatarUrl` or `imageUrl` database columns.

4.  **Client-Side Implementation:**
    - **Image Picker UI:**
      - Create a reusable UI component (e.g., `ImageSelectorModal` or `ImageGridPicker`).
      - When the component loads (e.g., for profile editing or module creation), fetch the list of available image URLs by calling the new backend endpoint (`GET /api/v1/assets/images?type=avatar` or `?type=module`).
      - Display the fetched images as selectable thumbnails.
    - **Integration:**
      - Integrate the image picker component into the profile editing form and the reading module creation/editing form.
      - When a user selects an image, store the _selected image URL_ in the form's state.
    - **API Calls:**
      - When submitting the profile or module form, send the _selected image URL_ as the value for the `avatarUrl` or `imageUrl` field in the payload to the relevant backend update/create endpoint.
5.  Add Language column to reading module table
    - Add UK or US english options

## Considerations

- **Image Optimization:** Ensure uploaded images are reasonably sized and optimized for web use.
- **Security:** If not using a public bucket, ensure the backend correctly generates signed URLs or handles proxying image requests.
- **Scalability:** Storing the list in the DB is generally more scalable and performant than listing bucket contents on every request.
- **UI/UX:** Provide clear visual feedback for the selected image.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using EmpMgmt.Models;
using System.Data;

namespace EmpMgmt.Controllers
{
    public class EmployeeController : Controller
    {
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;

        public EmployeeController(
            IConfiguration configuration,
            IWebHostEnvironment environment)
        {
            _configuration = configuration;
            _environment = environment;
        } 
 

 
 
 
         
        // INDEX - DISPLAY ALL EMPLOYEES 
         
 
        [HttpGet]
        public IActionResult Index()
        {
            List<Employee> employees = new List<Employee>();

            try
            {
                string connectionString =
                    _configuration.GetConnectionString("DefaultConnection");

                using SqlConnection con =
                    new SqlConnection(connectionString);

                string query = @" 
                    SELECT ID, Name, Email, Picture, Qualification 
                    FROM Employee 
                    ORDER BY ID";

                using SqlCommand cmd =
                    new SqlCommand(query, con);

                con.Open();

                using SqlDataReader reader =
                    cmd.ExecuteReader();

                while (reader.Read())
                {
                    Employee employee = new Employee();

                    employee.ID =
                        Convert.ToInt32(reader["ID"]);

                    employee.Name =
                        reader["Name"] == DBNull.Value
                        ? ""
                        : reader["Name"].ToString();

                    employee.Email =
                        reader["Email"] == DBNull.Value
                        ? ""
                        : reader["Email"].ToString();

                    employee.Picture =
                        reader["Picture"] == DBNull.Value




                        ? null
                        : reader["Picture"].ToString();

                    employee.Qualification =
                        reader["Qualification"] == DBNull.Value
                        ? ""
                        : reader["Qualification"].ToString();

                    employees.Add(employee);
                }

                return View(employees);
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;

                return View(employees);
            }
        }


        // SAVE / ADD EMPLOYEE 

        [HttpPost]
        public async Task<IActionResult> Save(
            string Name,
            string Email,
            string[] Qualifications,
            IFormFile? PictureFile)
        {
            try
            {

                // VALIDATION 

                if (string.IsNullOrWhiteSpace(Name))
                {
                    return Json(new
                    {
                        success = false,
                        message = "Name is required."
                    });
                }

                if (string.IsNullOrWhiteSpace(Email))
                {
                    return Json(new
                    {
                        success = false,
                        message = "Email is required."




                    });
                }

                if (Qualifications == null ||
                    Qualifications.Length == 0)
                {
                    return Json(new
                    {
                        success = false,
                        message = "Please select qualification."
                    });
                }


                // QUALIFICATION 

                string qualification =
                    string.Join(", ", Qualifications);


                // IMAGE PATH 

                string? imagePath = null;


                if (PictureFile != null &&
                    PictureFile.Length > 0)
                {
                    imagePath =
                        await SaveImage(PictureFile);
                }


                // DATABASE INSERT 

                string connectionString =
                    _configuration.GetConnectionString(
                        "DefaultConnection");

                using SqlConnection con =
                    new SqlConnection(connectionString);

                string query = @" 
                    INSERT INTO Employee
                    ( 
                        Name, 
                        Email, 
                        Picture, 
                        Qualification 
                    ) 
                    VALUES 
 
 
 
                    ( 
                        @Name, 
                        @Email, 
                        @Picture, 
                        @Qualification 
                    )";

                using SqlCommand cmd =
                    new SqlCommand(query, con);

                cmd.Parameters.AddWithValue(
                    "@Name",
                    Name);

                cmd.Parameters.AddWithValue(
                    "@Email",
                    Email);

                cmd.Parameters.AddWithValue(
                    "@Picture",
                    (object?)imagePath ?? DBNull.Value);

                cmd.Parameters.AddWithValue(
                    "@Qualification",
                    qualification);

                await con.OpenAsync();

                await cmd.ExecuteNonQueryAsync();


                return Json(new
                {
                    success = true,
                    message = "Employee saved successfully."
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        } 
 
 
          
        // GET EMPLOYEE FOR EDIT 
 
 
 
 
        [HttpGet]
        public IActionResult GetEmployee(int id)
        {
            try
            {
                string connectionString =
                    _configuration.GetConnectionString(
                        "DefaultConnection");

                using SqlConnection con =
                    new SqlConnection(connectionString);

                string query = @" 
                    SELECT ID, Name, Email, Picture, Qualification 
                    FROM Employee 
                    WHERE ID = @ID";

                using SqlCommand cmd =
                    new SqlCommand(query, con);

                cmd.Parameters.AddWithValue(
                    "@ID",
                    id);

                con.Open();

                using SqlDataReader reader =
                    cmd.ExecuteReader();

                if (reader.Read())
                {
                    Employee employee =
                        new Employee();

                    employee.ID =
                        Convert.ToInt32(reader["ID"]);

                    employee.Name =
                        reader["Name"] == DBNull.Value
                        ? ""
                        : reader["Name"].ToString();

                    employee.Email =
                        reader["Email"] == DBNull.Value
                        ? ""
                        : reader["Email"].ToString();

                    employee.Picture =
                        reader["Picture"] == DBNull.Value
                        ? null
                        : reader["Picture"].ToString();

                    



                    employee.Qualification =
                        reader["Qualification"] == DBNull.Value
                        ? ""
                        : reader["Qualification"].ToString();

                    return Json(new
                    {
                        success = true,
                        employee = employee
                    });
                }

                return Json(new
                {
                    success = false,
                    message = "Employee not found."
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }


        // UPDATE EMPLOYEE 

        [HttpPost]
        public async Task<IActionResult> Update(
            int ID,
            string Name,
            string Email,
            string[] Qualifications,
            IFormFile? PictureFile)
        {
            try
            {

                // VALIDATION 


                if (ID <= 0)
                {
                    return Json(new
                    {
                        success = false,

                        


                        message = "Invalid employee ID."
                    });
                }

                if (string.IsNullOrWhiteSpace(Name))
                {
                    return Json(new
                    {
                        success = false,
                        message = "Name is required."
                    });
                }

                if (string.IsNullOrWhiteSpace(Email))
                {
                    return Json(new
                    {
                        success = false,
                        message = "Email is required."
                    });
                }

                if (Qualifications == null ||
                    Qualifications.Length == 0)
                {
                    return Json(new
                    {
                        success = false,
                        message = "Please select qualification."
                    });
                }




                // QUALIFICATION 

                string qualification =
                    string.Join(", ", Qualifications);


                string connectionString =
                    _configuration.GetConnectionString(
                        "DefaultConnection");


                // IF NEW IMAGE IS SELECTED 

                if (PictureFile != null &&
                    PictureFile.Length > 0)
                {

                    


                    string? oldImage = null;


                    // Get old image 

                    using (SqlConnection con =
                           new SqlConnection(connectionString))
                    {
                        string selectQuery = @" 
                            SELECT Picture 
                            FROM Employee
                            WHERE ID = @ID";

                        using SqlCommand cmd =
                            new SqlCommand(
                                selectQuery,
                                con);

                        cmd.Parameters.AddWithValue(
                            "@ID",
                            ID);

                        await con.OpenAsync();

                        object? result =
                            await cmd.ExecuteScalarAsync();

                        if (result != null &&
                            result != DBNull.Value)
                        {
                            oldImage =
                                result.ToString();
                        }
                    }


                    // Save new image 

                    string newImagePath =
                        await SaveImage(PictureFile);


                    // Update database 

                    using (SqlConnection con =
                           new SqlConnection(connectionString))
                    {
                        string updateQuery = @" 
                            UPDATE Employee
                            SET 
                                Name = @Name, 
 

 
                                Email = @Email, 
                                Picture = @Picture, 
                                Qualification = @Qualification 
                            WHERE ID = @ID";

                        using SqlCommand cmd =
                            new SqlCommand(
                                updateQuery,
                                con);

                        cmd.Parameters.AddWithValue(
                            "@ID",
                            ID);

                        cmd.Parameters.AddWithValue(
                            "@Name",
                            Name);

                        cmd.Parameters.AddWithValue(
                            "@Email",
                            Email);

                        cmd.Parameters.AddWithValue(
                            "@Picture",
                            newImagePath);

                        cmd.Parameters.AddWithValue(
                            "@Qualification",
                            qualification);

                        await con.OpenAsync();

                        await cmd.ExecuteNonQueryAsync();
                    }


                    // Delete old image from folder 

                    DeleteImageFile(oldImage);
                }


                // NO NEW IMAGE SELECTED 
                // KEEP OLD IMAGE 

                else
                {
                    using SqlConnection con =
                        new SqlConnection(connectionString);

                    string updateQuery = @" 
 

 
                        UPDATE Employee
                        SET 
                            Name = @Name, 
                            Email = @Email, 
                            Qualification = @Qualification 
                        WHERE ID = @ID";

                    using SqlCommand cmd =
                        new SqlCommand(
                            updateQuery,
                            con);

                    cmd.Parameters.AddWithValue(
                        "@ID",
                        ID);

                    cmd.Parameters.AddWithValue(
                        "@Name",
                        Name);

                    cmd.Parameters.AddWithValue(
                        "@Email",
                        Email);

                    cmd.Parameters.AddWithValue(
                        "@Qualification",
                        qualification);

                    await con.OpenAsync();

                    await cmd.ExecuteNonQueryAsync();
                }


                return Json(new
                {
                    success = true,
                    message = "Employee updated successfully."
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        } 
 
 
 

 
        // DELETE EMPLOYEE 
 
        [HttpPost]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                string connectionString =
                    _configuration.GetConnectionString(
                        "DefaultConnection");


                // GET IMAGE BEFORE DELETE 


                string? imagePath = null;

                using (SqlConnection con =
                       new SqlConnection(connectionString))
                {
                    string selectQuery = @" 
                        SELECT Picture 
                        FROM Employee 
                        WHERE ID = @ID";

                    using SqlCommand cmd =
                        new SqlCommand(
                            selectQuery,
                            con);

                    cmd.Parameters.AddWithValue(
                        "@ID",
                        id);

                    await con.OpenAsync();

                    object? result =
                        await cmd.ExecuteScalarAsync();

                    if (result != null &&
                        result != DBNull.Value)
                    {
                        imagePath =
                            result.ToString();
                    }
                }


                // DELETE EMPLOYEE 

                using (SqlConnection con =




                       new SqlConnection(connectionString)) 
                {
                    string deleteQuery = @" 
                        DELETE FROM Employee
                        WHERE ID = @ID";

                    using SqlCommand cmd =
                        new SqlCommand(
                            deleteQuery,
                            con);

                    cmd.Parameters.AddWithValue(
                        "@ID",
                        id);

                    await con.OpenAsync();

                    int rows =
                        await cmd.ExecuteNonQueryAsync();

                    if (rows == 0)
                    {
                        return Json(new
                        {
                            success = false,
                            message = "Employee not found."
                        });
                    }
                }


                // DELETE IMAGE FROM FOLDER 

                DeleteImageFile(imagePath);


                return Json(new
                {
                    success = true,
                    message = "Employee deleted successfully."
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        } 
 
 
 
 
 
          
        // REMOVE ONLY IMAGE 
        
 
      [HttpPost]
        public async Task<IActionResult> RemoveImage(int id)
        {
            try
            {
                string connectionString =
                    _configuration.GetConnectionString(
                        "DefaultConnection");


                // GET CURRENT IMAGE 

                string? imagePath = null;

                using (SqlConnection con =
                       new SqlConnection(connectionString))
                {
                    string selectQuery = @" 
                        SELECT Picture 
                        FROM Employee 
                        WHERE ID = @ID";

                    using SqlCommand cmd =
                        new SqlCommand(
                            selectQuery,
                            con);

                    cmd.Parameters.AddWithValue(
                        "@ID",
                        id);

                    await con.OpenAsync();

                    object? result =
                        await cmd.ExecuteScalarAsync();

                    if (result != null &&
                        result != DBNull.Value)
                    {
                        imagePath =
                            result.ToString();
                    }
                }



                

  // SET PICTURE = NULL 


                using (SqlConnection con =
                       new SqlConnection(connectionString))
                {
                    string updateQuery = @" 
                        UPDATE Employee 
                        SET Picture = NULL 
                        WHERE ID = @ID";

                    using SqlCommand cmd =
                        new SqlCommand(
                            updateQuery,
                            con);

                    cmd.Parameters.AddWithValue(
                        "@ID",
                        id);

                    await con.OpenAsync();

                    int rows =
                        await cmd.ExecuteNonQueryAsync();

                    if (rows == 0)
                    {
                        return Json(new
                        {
                            success = false,
                            message = "Employee not found."
                        });
                    }
                }



                // DELETE IMAGE FILE 

                DeleteImageFile(imagePath);


                return Json(new
                {
                    success = true,
                    message = "Image removed successfully."
                });
            }
            catch (Exception ex)
            {
                return Json(new





                {
                    success = false, 
                    message = ex.Message
                });
            }
        }


        // SAVE IMAGE TO WWWROOT/UPLOADS 


        private async Task<string> SaveImage(
            IFormFile pictureFile)
        {
            string uploadsFolder =
                Path.Combine(
                    _environment.WebRootPath,
                    "uploads");


            // Create uploads folder if it doesn't exist 

            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(
                    uploadsFolder);
            }


            // Generate unique filename 

            string extension =
                Path.GetExtension(
                    pictureFile.FileName);

            string fileName =
                Guid.NewGuid().ToString()
                + extension;


            string filePath =
                Path.Combine(
                    uploadsFolder,
                    fileName);


            // Save file 

            using (FileStream stream =
                   new FileStream(
                       filePath,




                       FileMode.Create))
            {
                await pictureFile.CopyToAsync(
                    stream);
            }


            // Return path that browser can use 

            return "/uploads/" + fileName;
        }


        // DELETE IMAGE FILE 


        private void DeleteImageFile(
            string? imagePath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(
                    imagePath))
                {
                    return;
                }


                string cleanPath =
                    imagePath.TrimStart('/')
                             .Replace(
                                 '/',
                                 Path.DirectorySeparatorChar);


                string fullPath =
                    Path.Combine(
                        _environment.WebRootPath,
                        cleanPath);


                if (System.IO.File.Exists(
                    fullPath))
                {
                    System.IO.File.Delete(
                        fullPath);
                }
            }
            catch
            {
                // Do not stop database operation 

                

                // if image deletion fails. 
            }
        }
    }
}

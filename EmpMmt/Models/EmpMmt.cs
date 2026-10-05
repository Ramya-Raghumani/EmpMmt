using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace EmpMgmt.Models
{
    public class Employee
    {
        public int ID { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        public string? Picture { get; set; }

        [Required]
        public string Qualification { get; set; }

        public IFormFile? ImageFile { get; set; }
    }
}
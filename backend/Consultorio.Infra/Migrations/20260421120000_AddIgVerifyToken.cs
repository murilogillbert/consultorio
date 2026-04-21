using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddIgVerifyToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IgVerifyToken",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IgVerifyToken",
                table: "Clinics");
        }
    }
}

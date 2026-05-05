using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicSmtpSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SmtpHost",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SmtpPort",
                table: "Clinics",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpUsername",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpPassword",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpFrom",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SmtpConnected",
                table: "Clinics",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "SmtpHost",      table: "Clinics");
            migrationBuilder.DropColumn(name: "SmtpPort",      table: "Clinics");
            migrationBuilder.DropColumn(name: "SmtpUsername",  table: "Clinics");
            migrationBuilder.DropColumn(name: "SmtpPassword",  table: "Clinics");
            migrationBuilder.DropColumn(name: "SmtpFrom",      table: "Clinics");
            migrationBuilder.DropColumn(name: "SmtpConnected", table: "Clinics");
        }
    }
}

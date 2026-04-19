using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicMercadoPagoCredentials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MpAccessTokenProd",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MpAccessTokenSandbox",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MpConnected",
                table: "Clinics",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MpPublicKey",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MpSandboxMode",
                table: "Clinics",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MpWebhookSecret",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MpAccessTokenProd",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "MpAccessTokenSandbox",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "MpConnected",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "MpPublicKey",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "MpSandboxMode",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "MpWebhookSecret",
                table: "Clinics");
        }
    }
}
